import type { AuditKind, Change, Channel, MappingStatus, SourceKind, Wording } from "./types";

export const STATUS_LABEL: Record<MappingStatus, string> = {
  ausstehend: "Ausstehend",
  altfassung: "Altfassung erkannt",
  aktuell: "Ausgetauscht / Aktuell",
  ungeklaert: "Ungeklärt",
};

export const STATUS_HINT: Record<MappingStatus, string> = {
  ausstehend: "Noch nicht geprüft",
  altfassung: "Alter Wortlaut bzw. alte Version wird noch ausgeliefert",
  aktuell: "Neuer Wortlaut nachgewiesen",
  ungeklaert: "Zugriff fehlgeschlagen oder Quelle unklar – zählt nicht als erledigt",
};

export const STATUS_ORDER: MappingStatus[] = ["altfassung", "ungeklaert", "ausstehend", "aktuell"];

export const CHANNEL_LABEL: Record<Channel, string> = {
  website: "Website",
  partnerportal_pdf: "Partnerportal-PDF",
  email: "E-Mail / Kampagne",
  social: "Social Media",
  print: "Print / POS",
  sonstiges: "Sonstiges",
};

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  url: "Abrufbare URL",
  manual: "Manuell (nicht automatisiert lesbar)",
};

export const TYPE_LABEL: Record<Change["type"], string> = {
  claim: "Claim",
  pflichttext: "Pflichttext",
};

export const AUDIT_KIND_LABEL: Record<AuditKind, string> = {
  zuordnung_angelegt: "Zuordnung angelegt",
  auto_abruf: "Automatischer Abruf",
  snapshot_pruefung: "Snapshot-Prüfung",
  manuelle_pruefung: "Manuelle Prüfung",
  zustaendigkeit_geaendert: "Zuständigkeit geändert",
  aenderung_abgeschlossen: "Änderung abgeschlossen",
};

export function wordingFor(change: Change, market: string): Wording {
  return change.localized[market] ?? { oldText: change.oldText, newText: change.newText };
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
}

export function fmtDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "–";
  const d = isoDate.length === 10 ? new Date(isoDate + "T00:00:00Z") : new Date(isoDate);
  return d.toLocaleDateString("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}
