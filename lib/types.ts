// Zentrales Datenmodell des Prototyps (lokale JSON-Datenbank unter data/db.json).

export type MappingStatus = "ausstehend" | "altfassung" | "aktuell" | "ungeklaert";
export type ChangeType = "claim" | "pflichttext";
export type Channel = "website" | "partnerportal_pdf" | "email" | "social" | "print" | "sonstiges";

/**
 * url    = öffentlich abrufbare Quelle, serverseitiger Abruf möglich
 * manual = nicht automatisiert lesbar (Login, ESP, Agentur-System …) –
 *          nur manuelle Bestätigung oder hochgeladener Snapshot/Export
 */
export type SourceKind = "url" | "manual";

export type AuditKind =
  | "zuordnung_angelegt"
  | "auto_abruf"
  | "snapshot_pruefung"
  | "manuelle_pruefung"
  | "zustaendigkeit_geaendert"
  | "aenderung_abgeschlossen";

export interface Person {
  id: string;
  name: string;
  email: string;
  team: string;
}

export interface Market {
  code: string; // z. B. "DE"
  name: string;
  language: string;
}

export interface Wording {
  oldText: string;
  newText: string;
}

export interface Change {
  id: string;
  title: string;
  type: ChangeType;
  description: string;
  /** Master-Wortlaut (Referenzsprache) */
  oldText: string;
  newText: string;
  /** Lokalisierte Wortlaute je Markt; fehlt ein Markt, gilt der Master-Wortlaut */
  localized: Record<string, Wording>;
  oldVersionId: string;
  versionId: string;
  effectiveDate: string; // YYYY-MM-DD
  ownerId: string;
  markets: string[];
  createdAt: string;
  createdBy: string;
  closedAt: string | null;
  closedBy: string | null;
}

export interface Target {
  id: string;
  name: string;
  market: string;
  channel: Channel;
  sourceKind: SourceKind;
  /** Für url: abrufbare URL (absolut oder relativ für Demo-Ziele). Für manual: Fundort/Referenz. */
  location: string;
  ownerId: string;
  accessNote: string;
  createdAt: string;
}

export interface Mapping {
  id: string;
  changeId: string;
  targetId: string;
  expectedVersionId: string;
  /** Verantwortlich für den Austausch an diesem Ausspielort */
  ownerId: string;
  dueDate: string | null;
  status: MappingStatus;
  statusSince: string;
  lastCheckAt: string | null;
  lastCheckKind: AuditKind | null;
  lastAuditId: string | null;
}

export interface AuditEntry {
  id: string;
  seq: number;
  timestamp: string;
  mappingId: string;
  changeId: string;
  targetId: string;
  kind: AuditKind;
  actorId: string;
  actorName: string;
  /** Geprüfte URL bzw. Quelle (Snapshot-Datei, manueller Fundort) */
  source: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  contentHash: string | null;
  foundOld: boolean | null;
  foundNew: boolean | null;
  foundVersionId: string | null;
  snippet: string | null;
  statusFrom: MappingStatus | null;
  statusTo: MappingStatus | null;
  note: string;
  evidenceRef: string | null;
  error: string | null;
  prevHash: string;
  hash: string;
}

export interface DemoState {
  /** Pfad der Demo-Zielseite -> ausgelieferte Fassung */
  pages: Record<string, "alt" | "neu">;
}

export interface DB {
  schemaVersion: 1;
  people: Person[];
  markets: Market[];
  changes: Change[];
  targets: Target[];
  mappings: Mapping[];
  audit: AuditEntry[];
  demo: DemoState;
}
