import "server-only";
import { sha256 } from "./audit-hash";
import { htmlToText, isPdf, looksClientRendered, looksLikeLogin, pdfToText } from "./extract";
import { evaluateText } from "./matching";
import type { MappingStatus } from "./types";

export const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 10 * 1024 * 1024;

export interface CheckOutcome {
  statusTo: MappingStatus;
  source: string;
  httpStatus: number | null;
  durationMs: number | null;
  contentHash: string | null;
  foundOld: boolean | null;
  foundNew: boolean | null;
  foundVersionId: string | null;
  snippet: string | null;
  note: string;
  error: string | null;
}

interface Expect {
  oldText: string;
  newText: string;
  oldVersionId: string;
  newVersionId: string;
}

function unresolved(source: string, error: string, note: string, extra: Partial<CheckOutcome> = {}): CheckOutcome {
  return {
    statusTo: "ungeklaert",
    source,
    httpStatus: null,
    durationMs: null,
    contentHash: null,
    foundOld: null,
    foundNew: null,
    foundVersionId: null,
    snippet: null,
    note,
    error,
    ...extra,
  };
}

const HTTP_REASONS: Record<number, string> = {
  401: "Authentifizierung erforderlich",
  403: "Zugriff verweigert",
  404: "Seite nicht gefunden",
  410: "Seite entfernt",
  429: "Zu viele Anfragen (Rate-Limit)",
  451: "Aus rechtlichen Gründen gesperrt",
  500: "Serverfehler",
  502: "Bad Gateway",
  503: "Dienst nicht verfügbar",
  504: "Gateway-Zeitüberschreitung",
};

function describeFetchError(err: unknown): string {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return `Zeitüberschreitung nach ${FETCH_TIMEOUT_MS / 1000} s`;
  const code = e?.cause?.code;
  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "Host nicht auflösbar (DNS)";
    case "ECONNREFUSED":
      return "Verbindung abgelehnt";
    case "ECONNRESET":
      return "Verbindung zurückgesetzt (Firewall/Proxy?)";
    case "CERT_HAS_EXPIRED":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "ERR_TLS_CERT_ALTNAME_INVALID":
      return `TLS-Zertifikatsfehler (${code})`;
  }
  return `Abruf fehlgeschlagen: ${e?.cause?.message ?? e?.message ?? String(err)}`;
}

async function readCapped(res: Response): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`Antwort größer als ${MAX_BYTES / 1024 / 1024} MB`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Wertet bereits vorliegenden Inhalt (Abruf oder Snapshot) aus. */
export async function evaluateContent(
  buf: Uint8Array,
  contentType: string,
  sourceLabel: string,
  exp: Expect,
  opts: { finalUrl?: string; detectLogin?: boolean } = {},
): Promise<Omit<CheckOutcome, "httpStatus" | "durationMs">> {
  const contentHash = sha256(Buffer.from(buf));
  let text: string;
  let format = "Text";
  try {
    if (isPdf(buf, contentType, sourceLabel)) {
      format = "PDF";
      text = await pdfToText(buf);
      if (!text.trim()) {
        return {
          ...unresolved(sourceLabel, "PDF enthält keinen extrahierbaren Text", "PDF ohne Textebene (z. B. gescannt) – manuelle Sichtprüfung erforderlich."),
          contentHash,
        };
      }
    } else if (/html|xml/i.test(contentType) || /^\s*</.test(new TextDecoder().decode(buf.slice(0, 200)))) {
      format = "HTML";
      const html = new TextDecoder("utf-8").decode(buf);
      if (opts.detectLogin && opts.finalUrl && looksLikeLogin(html, opts.finalUrl)) {
        return {
          ...unresolved(sourceLabel, "Login-Seite statt Inhalt ausgeliefert", "Ziel ist login-geschützt – nicht automatisiert lesbar. Manuelle Prüfung oder Snapshot erforderlich."),
          contentHash,
        };
      }
      text = htmlToText(html);
      if (looksClientRendered(html, text)) {
        const r = evaluateText(text, exp.oldText, exp.newText, { oldVersionId: exp.oldVersionId, newVersionId: exp.newVersionId });
        if (r.status === "ungeklaert") {
          return {
            ...unresolved(sourceLabel, "Seite wird clientseitig gerendert", "Inhalt wird per JavaScript nachgeladen und ist im Server-Abruf nicht sichtbar – manuelle Prüfung erforderlich."),
            contentHash,
          };
        }
      }
    } else if (/^text\//i.test(contentType) || !contentType) {
      text = new TextDecoder("utf-8").decode(buf);
    } else {
      return {
        ...unresolved(sourceLabel, `Format nicht auswertbar (${contentType})`, "Inhaltstyp wird nicht unterstützt – manuelle Prüfung erforderlich."),
        contentHash,
      };
    }
  } catch (err) {
    return {
      ...unresolved(sourceLabel, `Textextraktion fehlgeschlagen: ${(err as Error).message}`, "Inhalt konnte nicht gelesen werden – manuelle Prüfung erforderlich."),
      contentHash,
    };
  }

  const r = evaluateText(text, exp.oldText, exp.newText, { oldVersionId: exp.oldVersionId, newVersionId: exp.newVersionId });
  return {
    statusTo: r.status,
    source: sourceLabel,
    contentHash,
    foundOld: r.foundOld,
    foundNew: r.foundNew,
    foundVersionId: r.foundVersionId,
    snippet: r.snippet,
    note: `[${format}] ${r.reason}`,
    error: null,
  };
}

/** Serverseitiger Abruf mit Timeout. Wirft nie – jeder Fehler endet als "ungeklaert". */
export async function fetchAndEvaluate(url: string, exp: Expect): Promise<CheckOutcome> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return unresolved(url, "Ungültige URL", "Quelle ist keine gültige URL – Ausspielort korrigieren.");
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return unresolved(url, `Protokoll ${parsed.protocol} nicht unterstützt`, "Nur http(s) kann automatisch abgerufen werden.");
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(parsed, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "ClaimTracker-Pilot/0.1 (interne Pflichttext-Pruefung)",
        Accept: "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.5",
      },
    });
  } catch (err) {
    return unresolved(url, describeFetchError(err), "Quelle nicht erreichbar – Status bleibt ungeklärt, bis manuell geprüft.", {
      durationMs: Date.now() - started,
    });
  }

  const durationMs = () => Date.now() - started;
  const finalUrl = res.url || parsed.toString();
  if (!res.ok) {
    const reason = HTTP_REASONS[res.status] ?? res.statusText ?? "Fehler";
    return unresolved(finalUrl, `HTTP ${res.status} – ${reason}`, "Quelle nicht automatisiert lesbar (Login/Firewall/Fehlerseite). Manuelle Prüfung oder Snapshot erforderlich.", {
      httpStatus: res.status,
      durationMs: durationMs(),
    });
  }

  let buf: Uint8Array;
  try {
    buf = await readCapped(res);
  } catch (err) {
    return unresolved(finalUrl, describeFetchError(err), "Inhalt konnte nicht vollständig gelesen werden.", {
      httpStatus: res.status,
      durationMs: durationMs(),
    });
  }

  const evald = await evaluateContent(buf, res.headers.get("content-type") ?? "", finalUrl, exp, {
    finalUrl,
    detectLogin: true,
  });
  return { ...evald, httpStatus: res.status, durationMs: durationMs() };
}
