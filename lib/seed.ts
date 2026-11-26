import { GENESIS_HASH, hashAuditEntry } from "./audit-hash";
import { DEMO_DEFAULT_STATE, DEMO_PATHS, TEXTS } from "./demo-content";
import { evaluateText } from "./matching";
import type { AuditEntry, Change, DB, Mapping, MappingStatus, Person, Target } from "./types";

const people: Person[] = [
  { id: "p-brandt", name: "Dr. Lena Brandt", email: "l.brandt@nordhaven.example", team: "Legal & Regulatory" },
  { id: "p-keller", name: "Tobias Keller", email: "t.keller@nordhaven.example", team: "Web DE" },
  { id: "p-yilmaz", name: "Aylin Yılmaz", email: "a.yilmaz@nordhaven.example", team: "Partnerportal / Trade Marketing" },
  { id: "p-moreau", name: "Camille Moreau", email: "c.moreau@nordhaven.example", team: "Marketing FR" },
  { id: "p-weber", name: "Jonas Weber", email: "j.weber@nordhaven.example", team: "CRM / E-Mail" },
];

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

export function buildSeed(now = new Date()): DB {
  const t = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000).toISOString();
  const g = TEXTS.gar;
  const c = TEXTS.claim;

  const changes: Change[] = [
    {
      id: "chg-gar-60",
      title: "Garantie-Pflichthinweis W7: Registrierungsfrist 30 → 60 Tage",
      type: "pflichttext",
      description:
        "Verlängerung der Registrierungsfrist für die 5-Jahres-Herstellergarantie. Freigabe Legal vom 18.11.2026. Alle Ausspielorte müssen bis zum Gültigkeitsdatum den neuen Wortlaut tragen.",
      oldText: g.de.old,
      newText: g.de.new,
      localized: { FR: { oldText: g.fr.old, newText: g.fr.new } },
      oldVersionId: g.oldVersion,
      versionId: g.newVersion,
      effectiveDate: "2026-12-01",
      ownerId: "p-brandt",
      markets: ["DE", "FR"],
      createdAt: t(120),
      createdBy: "p-brandt",
      closedAt: null,
      closedBy: null,
    },
    {
      id: "chg-claim-leise",
      title: "Claim „leiseste Waschmaschine“ abschwächen + Fußnote",
      type: "claim",
      description:
        "Superlativ-Claim nach Hinweis der Rechtsabteilung (Wettbewerbsrecht) durch abgeschwächte Formulierung mit Fußnote ersetzt.",
      oldText: c.de.old,
      newText: c.de.new,
      localized: {},
      oldVersionId: c.oldVersion,
      versionId: c.newVersion,
      effectiveDate: "2026-11-15",
      ownerId: "p-brandt",
      markets: ["DE"],
      createdAt: t(260),
      createdBy: "p-brandt",
      closedAt: null,
      closedBy: null,
    },
  ];

  const targets: Target[] = [
    {
      id: "tg-de-web-w7",
      name: "Produktseite W7 (Herstellerseite DE)",
      market: "DE",
      channel: "website",
      sourceKind: "url",
      location: DEMO_PATHS.deSite,
      ownerId: "p-keller",
      accessNote: "Öffentlich erreichbar (Demo-Zielseite).",
      createdAt: t(300),
    },
    {
      id: "tg-de-pdf-w7",
      name: "Händler-Datenblatt W7 (Partnerportal DE, PDF)",
      market: "DE",
      channel: "partnerportal_pdf",
      sourceKind: "url",
      location: DEMO_PATHS.dePdf,
      ownerId: "p-yilmaz",
      accessNote: "Direkt-Link auf PDF, ohne Login abrufbar (Demo).",
      createdAt: t(300),
    },
    {
      id: "tg-fr-web-w7",
      name: "Page produit W7 (Herstellerseite FR)",
      market: "FR",
      channel: "website",
      sourceKind: "url",
      location: DEMO_PATHS.frSite,
      ownerId: "p-moreau",
      accessNote: "Öffentlich erreichbar (Demo-Zielseite).",
      createdAt: t(300),
    },
    {
      id: "tg-fr-pdf-w7",
      name: "Fiche revendeur W7 (Partnerportal FR, PDF)",
      market: "FR",
      channel: "partnerportal_pdf",
      sourceKind: "url",
      location: DEMO_PATHS.frPdf,
      ownerId: "p-yilmaz",
      accessNote: "Portal liefert ohne Händler-Login HTTP 403 (Demo).",
      createdAt: t(300),
    },
    {
      id: "tg-de-mail-reg",
      name: "E-Mail-Template „Garantie-Registrierung“ (DE)",
      market: "DE",
      channel: "email",
      sourceKind: "manual",
      location: "ESP · Kampagne NH-DE-REG-01 · Template v12 (Login erforderlich)",
      ownerId: "p-weber",
      accessNote: "Nur im E-Mail-Service-Provider einsehbar – Prüfung per Testversand/Export.",
      createdAt: t(300),
    },
    {
      id: "tg-fr-mail-reg",
      name: "E-Mail-Template „Enregistrement garantie“ (FR)",
      market: "FR",
      channel: "email",
      sourceKind: "manual",
      location: "Agentur-ESP (extern) · Kampagne NH-FR-REG",
      ownerId: "p-moreau",
      accessNote: "Wird von externer Agentur betrieben; kein direkter Zugriff.",
      createdAt: t(300),
    },
  ];

  const mappings: Mapping[] = [];
  const audit: AuditEntry[] = [];
  const nameOf = (id: string) => people.find((p) => p.id === id)!.name;

  function log(m: Mapping, e: Partial<AuditEntry> & { kind: AuditEntry["kind"]; actorId: string; timestamp: string }) {
    const prev = audit.length ? audit[audit.length - 1].hash : GENESIS_HASH;
    const base: Omit<AuditEntry, "hash"> = {
      id: `aud-${audit.length + 1}`,
      seq: audit.length + 1,
      timestamp: e.timestamp,
      mappingId: m.id,
      changeId: m.changeId,
      targetId: m.targetId,
      kind: e.kind,
      actorId: e.actorId,
      actorName: nameOf(e.actorId),
      source: e.source ?? null,
      httpStatus: e.httpStatus ?? null,
      durationMs: e.durationMs ?? null,
      contentHash: e.contentHash ?? null,
      foundOld: e.foundOld ?? null,
      foundNew: e.foundNew ?? null,
      foundVersionId: e.foundVersionId ?? null,
      snippet: e.snippet ?? null,
      statusFrom: e.statusFrom ?? null,
      statusTo: e.statusTo ?? null,
      note: e.note ?? "",
      evidenceRef: e.evidenceRef ?? null,
      error: e.error ?? null,
      prevHash: prev,
    };
    const entry: AuditEntry = { ...base, hash: hashAuditEntry(base) };
    audit.push(entry);
    m.lastAuditId = entry.id;
    if (entry.statusTo) {
      if (entry.statusTo !== m.status) m.statusSince = entry.timestamp;
      m.status = entry.statusTo;
    }
    if (e.kind !== "zuordnung_angelegt") {
      m.lastCheckAt = entry.timestamp;
      m.lastCheckKind = e.kind;
    }
  }

  function map(changeId: string, targetId: string, created: number, due: string | null): Mapping {
    const ch = changes.find((x) => x.id === changeId)!;
    const tg = targets.find((x) => x.id === targetId)!;
    const m: Mapping = {
      id: `map-${changeId.replace("chg-", "")}-${targetId.replace("tg-", "")}`,
      changeId,
      targetId,
      expectedVersionId: ch.versionId,
      ownerId: tg.ownerId,
      dueDate: due,
      status: "ausstehend",
      statusSince: t(created),
      lastCheckAt: null,
      lastCheckKind: null,
      lastAuditId: null,
    };
    mappings.push(m);
    log(m, {
      kind: "zuordnung_angelegt",
      actorId: ch.ownerId,
      timestamp: t(created),
      statusFrom: null,
      statusTo: "ausstehend",
      note: `Ausspielort zugeordnet; erwartete Master-Version ${ch.versionId}.`,
    });
    return m;
  }

  function autoCheck(m: Mapping, hoursAgo: number, text: string, oldT: string, newT: string, ch: Change, ms: number, actorId: string) {
    const r = evaluateText(text, oldT, newT, { oldVersionId: ch.oldVersionId, newVersionId: ch.versionId });
    const tg = targets.find((x) => x.id === m.targetId)!;
    log(m, {
      kind: "auto_abruf",
      actorId,
      timestamp: t(hoursAgo),
      source: tg.location,
      httpStatus: 200,
      durationMs: ms,
      foundOld: r.foundOld,
      foundNew: r.foundNew,
      foundVersionId: r.foundVersionId,
      snippet: r.snippet,
      statusFrom: m.status,
      statusTo: r.status as MappingStatus,
      note: r.reason,
    });
  }

  const demoDeSiteNew = stripHtml(`${c.de.new} ${g.de.new}`);
  const demoDePdfOld = `${c.de.old} Pflichthinweis Garantie (Textversion ${g.oldVersion}): ${g.de.old}`;

  // --- Änderung 1: Garantie-Pflichttext (DE + FR) ---
  const gar = changes[0];
  const m1 = map(gar.id, "tg-de-web-w7", 118, "2026-11-30");
  const m2 = map(gar.id, "tg-de-pdf-w7", 118, "2026-11-30");
  const m3 = map(gar.id, "tg-fr-web-w7", 117, "2026-11-30");
  const m4 = map(gar.id, "tg-fr-pdf-w7", 117, "2026-11-30");
  const m5 = map(gar.id, "tg-de-mail-reg", 116, "2026-12-01");
  const m6 = map(gar.id, "tg-fr-mail-reg", 116, "2026-12-01");

  autoCheck(m1, 30, demoDeSiteNew, g.de.old, g.de.new, gar, 412, "p-keller");
  autoCheck(m2, 26, demoDePdfOld, g.de.old, g.de.new, gar, 688, "p-yilmaz");
  log(m4, {
    kind: "auto_abruf",
    actorId: "p-yilmaz",
    timestamp: t(25),
    source: DEMO_PATHS.frPdf,
    httpStatus: 403,
    durationMs: 231,
    statusFrom: m4.status,
    statusTo: "ungeklaert",
    error: "HTTP 403 – Zugriff verweigert",
    note: "Quelle nicht automatisiert lesbar (Login/Firewall). Manuelle Prüfung oder Snapshot erforderlich.",
  });
  log(m6, {
    kind: "manuelle_pruefung",
    actorId: "p-moreau",
    timestamp: t(20),
    source: "Agentur-ESP (extern) · Kampagne NH-FR-REG",
    statusFrom: m6.status,
    statusTo: "ungeklaert",
    note: "Kein Zugriff auf das ESP der Agentur. Export/Testversand bei Agentur angefordert (Ticket MKT-4411).",
    evidenceRef: "MKT-4411",
  });
  void m3;
  void m5;

  // --- Änderung 2: Claim (nur DE) ---
  const cl = changes[1];
  const c1 = map(cl.id, "tg-de-web-w7", 250, "2026-11-14");
  const c2 = map(cl.id, "tg-de-pdf-w7", 250, "2026-11-14");
  autoCheck(c1, 200, demoDeSiteNew, c.de.old, c.de.new, cl, 398, "p-keller");
  autoCheck(c2, 199, demoDePdfOld, c.de.old, c.de.new, cl, 702, "p-yilmaz");

  return {
    schemaVersion: 1,
    people,
    markets: [
      { code: "DE", name: "Deutschland", language: "de" },
      { code: "FR", name: "Frankreich", language: "fr" },
      { code: "AT", name: "Österreich", language: "de" },
      { code: "CH", name: "Schweiz", language: "de/fr" },
    ],
    changes,
    targets,
    mappings,
    audit,
    demo: { pages: { ...DEMO_DEFAULT_STATE } },
  };
}
