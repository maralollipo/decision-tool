import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GENESIS_HASH, hashAuditEntry } from "./audit-hash";
import { buildSeed } from "./seed";
import type { AuditEntry, DB, Mapping } from "./types";

// Lokale JSON-Datenbank. Für einen Pilot mit wenigen Nutzer:innen ausreichend;
// Schreibzugriffe werden serialisiert und atomar (tmp + rename) geschrieben.

const DATA_DIR = process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const SNAPSHOT_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "snapshots");

/** Legt einen Snapshot inhaltsadressiert ab (Dateiname = Hash-Präfix). */
export function storeSnapshot(name: string, buf: Uint8Array) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ SNAPSHOT_DIR, name), buf);
}

export function readSnapshot(name: string): Buffer | null {
  const p = path.join(/*turbopackIgnore: true*/ SNAPSHOT_DIR, name);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

function writeFileAtomic(file: string, content: string) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

export function readDb(): DB {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = buildSeed();
    writeFileAtomic(DB_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialisierte Mutation: liest frisch, wendet `fn` an, schreibt atomar. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = readDb();
    const result = await fn(db);
    writeFileAtomic(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function resetDb() {
  return mutate((db) => {
    const fresh = buildSeed();
    Object.assign(db, fresh);
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  });
}

export function newId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export type AuditInput = Omit<
  AuditEntry,
  "id" | "seq" | "timestamp" | "mappingId" | "changeId" | "targetId" | "prevHash" | "hash" | "actorName" | "statusFrom"
> & { timestamp?: string };

/**
 * Einziger Weg, das Beleg-Log zu verändern: Anhängen. Es gibt bewusst keine
 * Funktion zum Bearbeiten oder Löschen. Jeder Eintrag ist per SHA-256 mit dem
 * Vorgänger verkettet (siehe /audit für die Integritätsprüfung).
 * Aktualisiert zugleich Status und Prüfzeitpunkt der Zuordnung.
 */
export function appendAudit(db: DB, mapping: Mapping, input: AuditInput): AuditEntry {
  const prev = db.audit.length ? db.audit[db.audit.length - 1].hash : GENESIS_HASH;
  const actor = db.people.find((p) => p.id === input.actorId);
  const timestamp = input.timestamp ?? new Date().toISOString();
  const base: Omit<AuditEntry, "hash"> = {
    id: newId("aud"),
    seq: db.audit.length + 1,
    timestamp,
    mappingId: mapping.id,
    changeId: mapping.changeId,
    targetId: mapping.targetId,
    kind: input.kind,
    actorId: input.actorId,
    actorName: actor?.name ?? input.actorId,
    source: input.source,
    httpStatus: input.httpStatus,
    durationMs: input.durationMs,
    contentHash: input.contentHash,
    foundOld: input.foundOld,
    foundNew: input.foundNew,
    foundVersionId: input.foundVersionId,
    snippet: input.snippet,
    statusFrom: mapping.status,
    statusTo: input.statusTo,
    note: input.note,
    evidenceRef: input.evidenceRef,
    error: input.error,
    prevHash: prev,
  };
  const entry: AuditEntry = { ...base, hash: hashAuditEntry(base) };
  db.audit.push(entry);

  mapping.lastAuditId = entry.id;
  if (input.kind === "auto_abruf" || input.kind === "snapshot_pruefung" || input.kind === "manuelle_pruefung") {
    mapping.lastCheckAt = timestamp;
    mapping.lastCheckKind = input.kind;
  }
  if (input.statusTo && input.statusTo !== mapping.status) {
    mapping.status = input.statusTo;
    mapping.statusSince = timestamp;
  }
  return entry;
}

export const emptyAudit = {
  source: null,
  httpStatus: null,
  durationMs: null,
  contentHash: null,
  foundOld: null,
  foundNew: null,
  foundVersionId: null,
  snippet: null,
  statusTo: null,
  note: "",
  evidenceRef: null,
  error: null,
} satisfies Partial<AuditInput>;
