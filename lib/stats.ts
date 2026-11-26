import type { DB, MappingStatus } from "./types";

export type Counts = Record<MappingStatus, number> & { total: number };

export function countStatuses(db: DB, changeId: string): Counts {
  const c: Counts = { ausstehend: 0, altfassung: 0, aktuell: 0, ungeklaert: 0, total: 0 };
  for (const m of db.mappings) {
    if (m.changeId !== changeId) continue;
    c[m.status]++;
    c.total++;
  }
  return c;
}

/** Nur "aktuell" zählt als erledigt – "ungeklärt" niemals. */
export function canClose(c: Counts): { ok: boolean; reason: string } {
  if (c.total === 0) return { ok: false, reason: "Keine Ausspielorte zugeordnet." };
  const open = c.total - c.aktuell;
  if (open > 0) {
    const parts = [
      c.altfassung && `${c.altfassung} mit Altfassung`,
      c.ungeklaert && `${c.ungeklaert} ungeklärt`,
      c.ausstehend && `${c.ausstehend} ausstehend`,
    ].filter(Boolean);
    return { ok: false, reason: `Noch ${open} Ausspielort(e) offen: ${parts.join(", ")}.` };
  }
  return { ok: true, reason: "Alle Ausspielorte nachweislich aktuell." };
}
