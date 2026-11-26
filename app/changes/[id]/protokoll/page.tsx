import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { StatusBadge } from "@/components/StatusBadge";
import { verifyChain } from "@/lib/audit-hash";
import { readDb } from "@/lib/db";
import { AUDIT_KIND_LABEL, CHANNEL_LABEL, STATUS_LABEL, TYPE_LABEL, fmtDate, fmtDateTime, wordingFor } from "@/lib/labels";
import { currentUser } from "@/lib/session";
import { canClose, countStatuses } from "@/lib/stats";

export default async function ProtokollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const change = db.changes.find((c) => c.id === id);
  if (!change) notFound();
  const user = await currentUser(db);
  const counts = countStatuses(db, id);
  const verdict = canClose(counts);
  const chain = verifyChain(db.audit);
  const person = (pid: string | null) => db.people.find((p) => p.id === pid)?.name ?? "–";
  const mappings = db.mappings
    .filter((m) => m.changeId === id)
    .map((m) => ({ m, t: db.targets.find((t) => t.id === m.targetId)! }))
    .sort((a, b) => a.t.market.localeCompare(b.t.market) || a.t.name.localeCompare(b.t.name));

  return (
    <div className="mx-auto max-w-5xl space-y-6 bg-white p-8 text-sm shadow-sm print:p-0 print:shadow-none">
      <div className="no-print flex items-center justify-between">
        <Link href={`/changes/${id}`} className="text-slate-500 hover:underline">
          ← zurück zur Änderung
        </Link>
        <div className="flex gap-2">
          <a className="btn" href={`/changes/${id}/export`}>CSV Übersicht</a>
          <a className="btn" href={`/changes/${id}/export?art=log`}>CSV Beleg-Log</a>
          <PrintButton />
        </div>
      </div>

      <header className="border-b border-slate-300 pb-4">
        <div className="text-xs tracking-wide text-slate-500 uppercase">Prüfprotokoll · {TYPE_LABEL[change.type]}-Änderung</div>
        <h1 className="mt-1 text-2xl font-semibold">{change.title}</h1>
        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-xs md:grid-cols-4">
          <div><span className="text-slate-500">Version:</span> <span className="font-mono">{change.oldVersionId} → {change.versionId}</span></div>
          <div><span className="text-slate-500">Gültig ab:</span> {fmtDate(change.effectiveDate)}</div>
          <div><span className="text-slate-500">Owner:</span> {person(change.ownerId)}</div>
          <div><span className="text-slate-500">Märkte:</span> {change.markets.join(", ")}</div>
          <div><span className="text-slate-500">Erstellt:</span> {fmtDateTime(change.createdAt)}</div>
          <div><span className="text-slate-500">Abgeschlossen:</span> {change.closedAt ? `${fmtDateTime(change.closedAt)} (${person(change.closedBy)})` : "nein"}</div>
          <div><span className="text-slate-500">Protokoll erzeugt:</span> {fmtDateTime(new Date().toISOString())}</div>
          <div><span className="text-slate-500">durch:</span> {user.name}</div>
        </div>
      </header>

      <section>
        <h2 className="mb-2 font-semibold">Ergebnis</h2>
        <p className={verdict.ok ? "text-emerald-800" : "text-red-800"}>
          {verdict.ok ? "✔ " : "✖ "}
          {verdict.reason}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {counts.total} Ausspielorte: {counts.aktuell} {STATUS_LABEL.aktuell} · {counts.altfassung} {STATUS_LABEL.altfassung} · {counts.ungeklaert} {STATUS_LABEL.ungeklaert} ·{" "}
          {counts.ausstehend} {STATUS_LABEL.ausstehend}. Hinweis: „Ungeklärt“ wird nicht als erledigt gewertet.
        </p>
        <p className={`mt-1 text-xs ${chain.ok ? "text-slate-600" : "font-semibold text-red-700"}`}>
          Integrität Beleg-Log (SHA-256-Kette, {chain.entries} Einträge gesamt): {chain.message}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Wortlaut</h2>
        {change.markets.map((mk) => {
          const w = wordingFor(change, mk);
          return (
            <div key={mk} className="grid grid-cols-[3rem_1fr_1fr] gap-3 text-xs">
              <div className="font-mono font-semibold">{mk}</div>
              <div><div className="text-slate-500">alt</div>{w.oldText}</div>
              <div><div className="text-slate-500">neu</div>{w.newText}</div>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Status je Ausspielort</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-2">Markt</th>
              <th className="py-1 pr-2">Ausspielort / Kanal</th>
              <th className="py-1 pr-2">Quelle</th>
              <th className="py-1 pr-2">Verantwortlich</th>
              <th className="py-1 pr-2">Status</th>
              <th className="py-1">Letzter Nachweis</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(({ m, t }) => {
              const last = db.audit.filter((a) => a.mappingId === m.id && a.statusTo).at(-1);
              return (
                <tr key={m.id} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pr-2 font-mono">{t.market}</td>
                  <td className="py-1.5 pr-2">{t.name}<div className="text-slate-500">{CHANNEL_LABEL[t.channel]}</div></td>
                  <td className="max-w-48 break-all py-1.5 pr-2">{t.location}<div className="text-slate-500">{t.sourceKind === "url" ? "automatisch abrufbar" : "nur manuell"}</div></td>
                  <td className="py-1.5 pr-2">{person(m.ownerId)}</td>
                  <td className="py-1.5 pr-2"><StatusBadge status={m.status} /></td>
                  <td className="py-1.5">
                    {last ? (
                      <>
                        {AUDIT_KIND_LABEL[last.kind]}, {fmtDateTime(last.timestamp)}, {last.actorName}
                        {last.error && <div className="text-amber-800">{last.error}</div>}
                        {last.evidenceRef && <div>Beleg: {last.evidenceRef}</div>}
                      </>
                    ) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Beleg-Log (chronologisch)</h2>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Zeit</th>
              <th className="py-1 pr-2">Ausspielort</th>
              <th className="py-1 pr-2">Art / Person</th>
              <th className="py-1 pr-2">Status</th>
              <th className="py-1">Details</th>
            </tr>
          </thead>
          <tbody>
            {db.audit.filter((a) => a.changeId === id).map((e) => {
              const t = db.targets.find((x) => x.id === e.targetId);
              return (
                <tr key={e.id} className="border-b border-slate-100 align-top" style={{ breakInside: "avoid" }}>
                  <td className="py-1 pr-2 font-mono">{e.seq}</td>
                  <td className="whitespace-nowrap py-1 pr-2">{fmtDateTime(e.timestamp)}</td>
                  <td className="py-1 pr-2">{t?.market} · {t?.name}</td>
                  <td className="py-1 pr-2">{AUDIT_KIND_LABEL[e.kind]}<div className="text-slate-500">{e.actorName}</div></td>
                  <td className="whitespace-nowrap py-1 pr-2">{e.statusTo ? `${e.statusFrom ? STATUS_LABEL[e.statusFrom] : "–"} → ${STATUS_LABEL[e.statusTo]}` : "–"}</td>
                  <td className="py-1">
                    {e.source && <div className="break-all">Quelle: {e.source}{e.httpStatus !== null && ` (HTTP ${e.httpStatus})`}</div>}
                    {e.error && <div className="text-amber-800">Fehler: {e.error}</div>}
                    {e.snippet && <div className="font-mono text-slate-600">„{e.snippet}“</div>}
                    {e.note && <div>{e.note}</div>}
                    {e.evidenceRef && <div>Beleg: {e.evidenceRef}</div>}
                    <div className="font-mono text-slate-400">{e.hash.slice(0, 16)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
