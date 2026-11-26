"use server";

import path from "node:path";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sha256 } from "./audit-hash";
import { evaluateContent, fetchAndEvaluate } from "./checker";
import { appendAudit, emptyAudit, mutate, newId, readDb, resetDb, storeSnapshot } from "./db";
import { wordingFor } from "./labels";
import { USER_COOKIE, currentUser } from "./session";
import { canClose, countStatuses } from "./stats";
import type { Change, Channel, DB, Mapping, MappingStatus, SourceKind, Target } from "./types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Relative Demo-URLs (/demo/...) werden gegen die eigene App aufgelöst. */
async function resolveUrl(location: string): Promise<string> {
  return location.startsWith("/") ? new URL(location, await origin()).toString() : location;
}

function refresh(changeId?: string) {
  revalidatePath("/", "layout");
  if (changeId) revalidatePath(`/changes/${changeId}`);
}

// ---------- Sitzung / Demo ----------

export async function setUser(fd: FormData) {
  (await cookies()).set(USER_COOKIE, str(fd, "userId"), { path: "/", sameSite: "lax" });
  refresh();
}

export async function resetDemo() {
  await resetDb();
  refresh();
  redirect("/");
}

export async function setDemoPage(fd: FormData) {
  const p = str(fd, "path");
  const state = str(fd, "state") === "neu" ? "neu" : "alt";
  await mutate((db) => {
    db.demo.pages[p] = state;
  });
  refresh();
}

// ---------- Änderungen ----------

export interface FormState {
  error?: string;
}

export async function createChange(_prev: FormState, fd: FormData): Promise<FormState> {
  const db = readDb();
  const user = await currentUser(db);
  const markets = fd.getAll("markets").map(String).filter(Boolean);
  const title = str(fd, "title");
  const type = str(fd, "type") as Change["type"];
  const oldText = str(fd, "oldText");
  const newText = str(fd, "newText");
  const versionId = str(fd, "versionId");
  const oldVersionId = str(fd, "oldVersionId");
  const effectiveDate = str(fd, "effectiveDate");
  const ownerId = str(fd, "ownerId");

  if (!title || !oldText || !newText || !versionId || !effectiveDate || !ownerId)
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  if (!["claim", "pflichttext"].includes(type)) return { error: "Ungültiger Typ." };
  if (markets.length === 0) return { error: "Mindestens einen Markt auswählen." };
  if (oldText === newText) return { error: "Alter und neuer Wortlaut sind identisch." };

  const localized: Change["localized"] = {};
  for (const m of markets) {
    const o = str(fd, `old_${m}`);
    const n = str(fd, `new_${m}`);
    if (o || n) {
      if (!o || !n) return { error: `Markt ${m}: Für lokalisierten Wortlaut alt UND neu angeben.` };
      localized[m] = { oldText: o, newText: n };
    }
  }

  const id = newId("chg");
  const autoMap = fd.get("autoMap") === "on";
  await mutate((d) => {
    d.changes.unshift({
      id,
      title,
      type,
      description: str(fd, "description"),
      oldText,
      newText,
      localized,
      oldVersionId,
      versionId,
      effectiveDate,
      ownerId,
      markets,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      closedAt: null,
      closedBy: null,
    });
    if (autoMap) {
      for (const t of d.targets.filter((t) => markets.includes(t.market))) addMapping(d, id, t, user.id, effectiveDate);
    }
  });
  refresh();
  redirect(`/changes/${id}`);
}

function addMapping(db: DB, changeId: string, target: Target, actorId: string, dueDate: string | null) {
  const change = db.changes.find((c) => c.id === changeId)!;
  if (db.mappings.some((m) => m.changeId === changeId && m.targetId === target.id)) return;
  const m: Mapping = {
    id: newId("map"),
    changeId,
    targetId: target.id,
    expectedVersionId: change.versionId,
    ownerId: target.ownerId,
    dueDate,
    status: "ausstehend",
    statusSince: new Date().toISOString(),
    lastCheckAt: null,
    lastCheckKind: null,
    lastAuditId: null,
  };
  db.mappings.push(m);
  appendAudit(db, m, {
    ...emptyAudit,
    kind: "zuordnung_angelegt",
    actorId,
    statusTo: "ausstehend",
    note: `Ausspielort zugeordnet; erwartete Master-Version ${change.versionId}.`,
  });
}

export async function addMappings(fd: FormData) {
  const changeId = str(fd, "changeId");
  const ids = fd.getAll("targetIds").map(String);
  const db = readDb();
  const user = await currentUser(db);
  await mutate((d) => {
    const ch = d.changes.find((c) => c.id === changeId);
    if (!ch || ch.closedAt) return;
    for (const id of ids) {
      const t = d.targets.find((t) => t.id === id);
      if (t) addMapping(d, changeId, t, user.id, ch.effectiveDate);
    }
  });
  refresh(changeId);
}

export async function closeChange(fd: FormData) {
  const changeId = str(fd, "changeId");
  const db = readDb();
  const user = await currentUser(db);
  await mutate((d) => {
    const ch = d.changes.find((c) => c.id === changeId);
    if (!ch || ch.closedAt) return;
    const verdict = canClose(countStatuses(d, changeId));
    if (!verdict.ok) throw new Error(verdict.reason);
    ch.closedAt = new Date().toISOString();
    ch.closedBy = user.id;
    for (const m of d.mappings.filter((m) => m.changeId === changeId)) {
      appendAudit(d, m, { ...emptyAudit, kind: "aenderung_abgeschlossen", actorId: user.id, note: "Änderung abgeschlossen – alle Ausspielorte nachweislich aktuell." });
    }
  });
  refresh(changeId);
}

// ---------- Zuordnung: Zuständigkeit ----------

export async function reassignMapping(fd: FormData) {
  const mappingId = str(fd, "mappingId");
  const ownerId = str(fd, "ownerId");
  const dueDate = str(fd, "dueDate") || null;
  const db = readDb();
  const user = await currentUser(db);
  let changeId = "";
  await mutate((d) => {
    const m = d.mappings.find((x) => x.id === mappingId);
    const owner = d.people.find((p) => p.id === ownerId);
    if (!m || !owner) return;
    changeId = m.changeId;
    if (m.ownerId === ownerId && m.dueDate === dueDate) return;
    const before = d.people.find((p) => p.id === m.ownerId)?.name ?? m.ownerId;
    m.ownerId = ownerId;
    m.dueDate = dueDate;
    appendAudit(d, m, {
      ...emptyAudit,
      kind: "zustaendigkeit_geaendert",
      actorId: user.id,
      note: `Verantwortlich: ${before} → ${owner.name}; Frist: ${dueDate ?? "keine"}.`,
    });
  });
  refresh(changeId);
}

// ---------- Prüfungen ----------

async function runAutoCheck(mappingId: string, actorId: string): Promise<void> {
  const db = readDb();
  const m = db.mappings.find((x) => x.id === mappingId);
  if (!m) return;
  const t = db.targets.find((x) => x.id === m.targetId)!;
  const ch = db.changes.find((x) => x.id === m.changeId)!;
  if (t.sourceKind !== "url" || ch.closedAt) return; // keine Schein-Automatisierung

  const w = wordingFor(ch, t.market);
  const url = await resolveUrl(t.location);
  const outcome = await fetchAndEvaluate(url, {
    oldText: w.oldText,
    newText: w.newText,
    oldVersionId: ch.oldVersionId,
    newVersionId: ch.versionId,
  });
  await mutate((d) => {
    const mm = d.mappings.find((x) => x.id === mappingId)!;
    appendAudit(d, mm, {
      kind: "auto_abruf",
      actorId,
      ...outcome,
      // Für Demo-Ziele den relativen Pfad protokollieren (Host variiert je Umgebung)
      source: t.location.startsWith("/") ? t.location : outcome.source,
      evidenceRef: null,
    });
  });
}

export async function checkMapping(fd: FormData) {
  const mappingId = str(fd, "mappingId");
  const db = readDb();
  const user = await currentUser(db);
  await runAutoCheck(mappingId, user.id);
  const m = db.mappings.find((x) => x.id === mappingId);
  refresh(m?.changeId);
}

export async function checkAllForChange(fd: FormData) {
  const changeId = str(fd, "changeId");
  const db = readDb();
  const user = await currentUser(db);
  const ids = db.mappings
    .filter((m) => m.changeId === changeId)
    .filter((m) => db.targets.find((t) => t.id === m.targetId)?.sourceKind === "url")
    .map((m) => m.id);
  // parallel abrufen; das Schreiben ist ohnehin serialisiert
  await Promise.all(ids.map((id) => runAutoCheck(id, user.id)));
  refresh(changeId);
}

export async function manualCheck(_prev: FormState, fd: FormData): Promise<FormState> {
  const mappingId = str(fd, "mappingId");
  const statusTo = str(fd, "statusTo") as MappingStatus;
  const note = str(fd, "note");
  const evidenceRef = str(fd, "evidenceRef");
  const source = str(fd, "source");
  const checkedAt = str(fd, "checkedAt");

  if (!["altfassung", "aktuell", "ungeklaert"].includes(statusTo)) return { error: "Bitte ein Prüfergebnis wählen." };
  if (!note) return { error: "Prüfer-Notiz ist Pflicht (was wurde wo geprüft?)." };
  if (statusTo === "aktuell" && !evidenceRef)
    return { error: "„Aktuell“ ohne Beleg ist nicht zulässig – bitte Screenshot-Link, Export oder Ticket-Referenz angeben." };

  const db = readDb();
  const user = await currentUser(db);
  let changeId = "";
  if (checkedAt) {
    const d = new Date(checkedAt);
    if (Number.isNaN(d.getTime())) return { error: "Ungültiger Prüfzeitpunkt." };
    if (d.getTime() > Date.now() + 5 * 60_000) return { error: "Prüfzeitpunkt liegt in der Zukunft." };
  }
  await mutate((d) => {
    const m = d.mappings.find((x) => x.id === mappingId);
    if (!m) return;
    const t = d.targets.find((x) => x.id === m.targetId)!;
    changeId = m.changeId;
    const effectiveTs = checkedAt ? new Date(checkedAt).toISOString() : undefined;
    appendAudit(d, m, {
      ...emptyAudit,
      kind: "manuelle_pruefung",
      actorId: user.id,
      source: source || t.location,
      statusTo,
      foundOld: statusTo === "altfassung" ? true : statusTo === "aktuell" ? false : null,
      foundNew: statusTo === "aktuell" ? true : null,
      note: effectiveTs ? `${note} (Prüfung erfolgt am ${new Date(effectiveTs).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}, erfasst am ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })})` : note,
      evidenceRef: evidenceRef || null,
    });
  });
  refresh(changeId);
  return {};
}

export async function snapshotCheck(_prev: FormState, fd: FormData): Promise<FormState> {
  const mappingId = str(fd, "mappingId");
  const file = fd.get("file");
  const pasted = str(fd, "pasted");
  const note = str(fd, "note");

  let buf: Uint8Array;
  let label: string;
  let contentType: string;
  let ext: string;
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return { error: "Datei größer als 10 MB." };
    buf = new Uint8Array(await file.arrayBuffer());
    label = file.name;
    contentType = file.type || "";
    ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  } else if (pasted) {
    buf = new TextEncoder().encode(pasted);
    label = "eingefügter Text-Export";
    contentType = "text/plain";
    ext = ".txt";
  } else {
    return { error: "Bitte Datei (HTML, PDF, TXT) hochladen oder Text-Export einfügen." };
  }
  if (!note) return { error: "Bitte angeben, woher der Snapshot stammt (z. B. „Testversand ESP vom 25.11.“)." };

  const db = readDb();
  const user = await currentUser(db);
  const m = db.mappings.find((x) => x.id === mappingId);
  if (!m) return { error: "Zuordnung nicht gefunden." };
  const t = db.targets.find((x) => x.id === m.targetId)!;
  const ch = db.changes.find((x) => x.id === m.changeId)!;
  const w = wordingFor(ch, t.market);

  const hash = sha256(Buffer.from(buf));
  const stored = `${hash.slice(0, 16)}${ext}`;
  storeSnapshot(stored, buf);

  const outcome = await evaluateContent(buf, contentType, label, {
    oldText: w.oldText,
    newText: w.newText,
    oldVersionId: ch.oldVersionId,
    newVersionId: ch.versionId,
  });
  await mutate((d) => {
    const mm = d.mappings.find((x) => x.id === mappingId)!;
    appendAudit(d, mm, {
      kind: "snapshot_pruefung",
      actorId: user.id,
      ...outcome,
      source: `Snapshot: ${label}`,
      httpStatus: null,
      durationMs: null,
      note: `${note} · ${outcome.note}`,
      evidenceRef: `/snapshots/${stored}`,
    });
  });
  refresh(m.changeId);
  return {};
}

// ---------- Ausspielorte ----------

export async function saveTarget(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const market = str(fd, "market");
  const channel = str(fd, "channel") as Channel;
  const sourceKind = str(fd, "sourceKind") as SourceKind;
  const location = str(fd, "location");
  const ownerId = str(fd, "ownerId");
  const accessNote = str(fd, "accessNote");
  if (!name || !market || !channel || !location || !ownerId) return { error: "Bitte alle Pflichtfelder ausfüllen." };
  if (sourceKind === "url" && !location.startsWith("/")) {
    try {
      const u = new URL(location);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      return { error: "Für „Abrufbare URL“ bitte eine gültige http(s)-URL angeben – oder Quelle auf „Manuell“ stellen." };
    }
  }
  await mutate((d) => {
    const existing = d.targets.find((t) => t.id === id);
    if (existing) Object.assign(existing, { name, market, channel, sourceKind, location, ownerId, accessNote });
    else
      d.targets.push({ id: newId("tg"), name, market, channel, sourceKind, location, ownerId, accessNote, createdAt: new Date().toISOString() });
  });
  refresh();
  redirect("/targets");
}
