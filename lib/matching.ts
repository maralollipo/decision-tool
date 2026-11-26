// Reine Text-Auswertung: Sucht alten vs. neuen Wortlaut in einem extrahierten Text.
// Keine Imports, damit die Logik isoliert getestet werden kann (tests/matching.test.ts).

export type EvalStatus = "altfassung" | "aktuell" | "ungeklaert";

export interface EvalResult {
  status: EvalStatus;
  foundOld: boolean;
  foundNew: boolean;
  foundVersionId: string | null;
  snippet: string | null;
  reason: string;
}

/** Vereinheitlicht typografische Varianten, Leerraum und Groß-/Kleinschreibung. */
export function normalizeForDisplay(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/­/g, "") // weiches Trennzeichen
    .replace(/[       ]/g, " ") // geschützte/schmale Leerzeichen
    .replace(/[​‌‍﻿]/g, "")
    .replace(/[„“”«»‟″]/g, '"')
    .replace(/[‚‘’‛′`´]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalize(input: string): string {
  return normalizeForDisplay(input).toLowerCase();
}

function snippetAround(display: string, norm: string, idx: number, len: number, pad = 90): string {
  // Bei abweichender Länge (seltene Sonderzeichen) auf normalisierten Text ausweichen.
  const base = display.length === norm.length ? display : norm;
  const start = Math.max(0, idx - pad);
  const end = Math.min(base.length, idx + len + pad);
  return (start > 0 ? "…" : "") + base.slice(start, end) + (end < base.length ? "…" : "");
}

/**
 * Bewertet einen Quelltext.
 * Regeln (bewusst konservativ):
 *  - alter Wortlaut gefunden            -> "altfassung" (auch wenn der neue zusätzlich vorkommt)
 *  - nur neuer Wortlaut gefunden        -> "aktuell"
 *  - keiner von beiden gefunden         -> "ungeklaert" (niemals automatisch "erledigt")
 * Ist der alte Wortlaut Teil des neuen, werden Fundstellen des neuen vor der Suche
 * nach dem alten entfernt, um Fehlalarme zu vermeiden.
 */
export function evaluateText(
  sourceText: string,
  oldText: string,
  newText: string,
  versions: { oldVersionId?: string; newVersionId?: string } = {},
): EvalResult {
  const display = normalizeForDisplay(sourceText);
  const norm = display.toLowerCase();
  const nOld = normalize(oldText);
  const nNew = normalize(newText);

  if (!norm) {
    return {
      status: "ungeklaert",
      foundOld: false,
      foundNew: false,
      foundVersionId: null,
      snippet: null,
      reason: "Kein auswertbarer Text in der Quelle gefunden.",
    };
  }

  const newIdx = nNew ? norm.indexOf(nNew) : -1;
  const foundNew = newIdx >= 0;

  let withoutNew = norm;
  if (foundNew) withoutNew = norm.split(nNew).join(" \u0000 ");
  const oldIdxMasked = nOld ? withoutNew.indexOf(nOld) : -1;
  const foundOld = oldIdxMasked >= 0;
  const oldIdx = foundOld ? (foundNew ? norm.indexOf(nOld) : oldIdxMasked) : -1;

  let foundVersionId: string | null = null;
  const vNew = versions.newVersionId?.toLowerCase();
  const vOld = versions.oldVersionId?.toLowerCase();
  if (vNew && norm.includes(vNew)) foundVersionId = versions.newVersionId!;
  else if (vOld && norm.includes(vOld)) foundVersionId = versions.oldVersionId!;

  if (foundOld) {
    return {
      status: "altfassung",
      foundOld,
      foundNew,
      foundVersionId,
      snippet: snippetAround(display, norm, oldIdx, nOld.length),
      reason: foundNew
        ? "Alter UND neuer Wortlaut gefunden – Altfassung wird noch ausgeliefert."
        : "Alter Wortlaut gefunden – Austausch steht aus.",
    };
  }
  if (foundNew) {
    return {
      status: "aktuell",
      foundOld,
      foundNew,
      foundVersionId,
      snippet: snippetAround(display, norm, newIdx, nNew.length),
      reason: "Neuer Wortlaut nachgewiesen, alter Wortlaut nicht (mehr) vorhanden.",
    };
  }

  // Weder alt noch neu: Teilfund als Hinweis ausgeben, aber Status bleibt ungeklärt.
  const probe = nNew.split(" ").slice(0, 5).join(" ");
  const probeIdx = probe.length > 10 ? norm.indexOf(probe) : -1;
  return {
    status: "ungeklaert",
    foundOld,
    foundNew,
    foundVersionId,
    snippet: probeIdx >= 0 ? snippetAround(display, norm, probeIdx, probe.length) : null,
    reason:
      probeIdx >= 0
        ? "Weder alter noch neuer Wortlaut exakt gefunden; ähnlicher Textanfang vorhanden (abweichende Fassung?). Manuelle Prüfung erforderlich."
        : "Weder alter noch neuer Wortlaut gefunden – Quelle/Zuordnung manuell prüfen (evtl. clientseitig gerendert oder falscher Ausspielort).",
  };
}
