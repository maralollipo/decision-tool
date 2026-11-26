import { createHash } from "node:crypto";
import type { AuditEntry } from "./types";

export const GENESIS_HASH = "0".repeat(64);

/** Hash über alle Felder außer `hash` selbst – verkettet über `prevHash`. */
export function hashAuditEntry(entry: Omit<AuditEntry, "hash">): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash: _ignored, ...rest } = entry as AuditEntry;
  const ordered = Object.keys(rest)
    .sort()
    .map((k) => [k, (rest as unknown as Record<string, unknown>)[k]]);
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export interface ChainCheck {
  ok: boolean;
  entries: number;
  brokenAt: number | null;
  message: string;
}

export function verifyChain(audit: AuditEntry[]): ChainCheck {
  let prev = GENESIS_HASH;
  for (let i = 0; i < audit.length; i++) {
    const e = audit[i];
    if (e.seq !== i + 1) return { ok: false, entries: audit.length, brokenAt: e.seq, message: `Lücke in der Sequenz bei #${i + 1}` };
    if (e.prevHash !== prev) return { ok: false, entries: audit.length, brokenAt: e.seq, message: `Verkettung bei #${e.seq} unterbrochen` };
    if (hashAuditEntry(e) !== e.hash) return { ok: false, entries: audit.length, brokenAt: e.seq, message: `Eintrag #${e.seq} wurde nachträglich verändert` };
    prev = e.hash;
  }
  return { ok: true, entries: audit.length, brokenAt: null, message: "Beleg-Log vollständig und unverändert" };
}
