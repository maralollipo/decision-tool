import { readDb } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { AUDIT_KIND_LABEL, CHANNEL_LABEL, STATUS_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const change = db.changes.find((c) => c.id === id);
  if (!change) return new Response("Nicht gefunden", { status: 404 });
  const full = new URL(req.url).searchParams.get("art") === "log";
  const person = (pid: string) => db.people.find((p) => p.id === pid)?.name ?? pid;
  const target = (tid: string) => db.targets.find((t) => t.id === tid);

  let rows: (string | number | null)[][];
  if (full) {
    rows = [["Nr", "Zeitstempel (UTC)", "Markt", "Kanal", "Ausspielort", "Art", "Person", "Quelle", "HTTP", "Alt gefunden", "Neu gefunden", "Versions-ID gefunden", "Status vorher", "Status nachher", "Textausschnitt", "Notiz", "Beleg", "Fehler", "Inhalts-Hash", "Eintrags-Hash"]];
    for (const e of db.audit.filter((a) => a.changeId === id)) {
      const t = target(e.targetId);
      rows.push([e.seq, e.timestamp, t?.market ?? "", t ? CHANNEL_LABEL[t.channel] : "", t?.name ?? "", AUDIT_KIND_LABEL[e.kind], e.actorName, e.source, e.httpStatus, e.foundOld === null ? "" : e.foundOld ? "ja" : "nein", e.foundNew === null ? "" : e.foundNew ? "ja" : "nein", e.foundVersionId, e.statusFrom ? STATUS_LABEL[e.statusFrom] : "", e.statusTo ? STATUS_LABEL[e.statusTo] : "", e.snippet, e.note, e.evidenceRef, e.error, e.contentHash, e.hash]);
    }
  } else {
    rows = [["Änderung", "Version", "Markt", "Kanal", "Ausspielort", "Quelle", "Quellenart", "Verantwortlich", "Frist", "Status", "Status seit", "Letzte Prüfung", "Prüfart", "Prüfer", "Textausschnitt", "Beleg", "Fehler/Hinweis"]];
    for (const m of db.mappings.filter((x) => x.changeId === id)) {
      const t = target(m.targetId)!;
      const last = db.audit.filter((a) => a.mappingId === m.id && a.kind !== "aenderung_abgeschlossen" && a.kind !== "zustaendigkeit_geaendert").at(-1);
      rows.push([change.title, m.expectedVersionId, t.market, CHANNEL_LABEL[t.channel], t.name, t.location, t.sourceKind === "url" ? "automatisch abrufbar" : "manuell", person(m.ownerId), m.dueDate, STATUS_LABEL[m.status], m.statusSince, m.lastCheckAt, last ? AUDIT_KIND_LABEL[last.kind] : "", last?.actorName ?? "", last?.snippet ?? "", last?.evidenceRef ?? "", last?.error ?? last?.note ?? ""]);
    }
  }
  const name = `pruefprotokoll_${change.versionId}_${full ? "belegLog" : "uebersicht"}_${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
