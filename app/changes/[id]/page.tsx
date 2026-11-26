import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditTrail } from "@/components/AuditTrail";
import { ManualCheckForm, SnapshotForm } from "@/components/CheckForms";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { WordingDiff } from "@/components/WordingDiff";
import { addMappings, checkAllForChange, checkMapping, closeChange, reassignMapping } from "@/lib/actions";
import { readDb } from "@/lib/db";
import { AUDIT_KIND_LABEL, CHANNEL_LABEL, STATUS_ORDER, TYPE_LABEL, fmtDate, fmtDateTime, wordingFor } from "@/lib/labels";
import { canClose, countStatuses } from "@/lib/stats";
import type { DB, Mapping, Target } from "@/lib/types";

function SourceCell({ t }: { t: Target }) {
  return t.sourceKind === "url" ? (
    <div>
      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-sky-200">automatisch abrufbar</span>
      <a href={t.location} target="_blank" rel="noreferrer" className="mt-1 block max-w-64 truncate text-xs text-sky-700 hover:underline" title={t.location}>
        {t.location}
      </a>
    </div>
  ) : (
    <div>
      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">nur manuell / Snapshot</span>
      <div className="mt-1 max-w-64 text-xs text-slate-500">{t.location}</div>
    </div>
  );
}

function evidenceLabel(db: DB, m: Mapping) {
  if (!m.lastCheckKind) return <span className="text-xs text-slate-400">noch nie geprüft</span>;
  const e = db.audit.find((a) => a.id === m.lastAuditId);
  return (
    <div className="text-xs">
      <div>{AUDIT_KIND_LABEL[m.lastCheckKind]}</div>
      <div className="text-slate-500">{fmtDateTime(m.lastCheckAt)}</div>
      {e?.error && <div className="text-amber-800">{e.error}</div>}
    </div>
  );
}

export default async function ChangeDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const { id } = await params;
  const { m: openId } = await searchParams;
  const db = readDb();
  const change = db.changes.find((c) => c.id === id);
  if (!change) notFound();

  const counts = countStatuses(db, id);
  const closable = canClose(counts);
  const owner = db.people.find((p) => p.id === change.ownerId);
  const person = (pid: string) => db.people.find((p) => p.id === pid);
  const mappings = db.mappings
    .filter((m) => m.changeId === id)
    .map((m) => ({ m, t: db.targets.find((t) => t.id === m.targetId)! }))
    .sort((a, b) => a.t.market.localeCompare(b.t.market) || STATUS_ORDER.indexOf(a.m.status) - STATUS_ORDER.indexOf(b.m.status));
  const unmapped = db.targets.filter((t) => !db.mappings.some((m) => m.changeId === id && m.targetId === t.id));
  const autoCount = mappings.filter((x) => x.t.sourceKind === "url").length;
  const open = openId ? mappings.find((x) => x.m.id === openId) : undefined;
  const isClosed = !!change.closedAt;

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Änderungen
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-700">{TYPE_LABEL[change.type]}</span>
            <span className="font-mono">
              {change.oldVersionId || "–"} → {change.versionId}
            </span>
            <span>· gültig ab {fmtDate(change.effectiveDate)}</span>
            <span>· Owner: {owner?.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{change.title}</h1>
          {change.description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{change.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isClosed && (
            <form action={checkAllForChange}>
              <input type="hidden" name="changeId" value={id} />
              <SubmitButton variant="primary" pendingText="Abruf läuft …" disabled={autoCount === 0}>
                Alle abrufbaren prüfen ({autoCount})
              </SubmitButton>
            </form>
          )}
          <a href={`/changes/${id}/export`} className="btn">
            CSV-Export
          </a>
          <Link href={`/changes/${id}/protokoll`} className="btn">
            Prüfprotokoll
          </Link>
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <ProgressBar counts={counts} />
        {isClosed ? (
          <div className="text-sm text-emerald-800">
            Abgeschlossen am {fmtDateTime(change.closedAt)} von {person(change.closedBy ?? "")?.name}
          </div>
        ) : (
          <form action={closeChange} className="flex items-center gap-3">
            <input type="hidden" name="changeId" value={id} />
            <span className={`text-xs ${closable.ok ? "text-emerald-700" : "text-slate-500"}`}>{closable.reason}</span>
            <SubmitButton disabled={!closable.ok} title={closable.reason}>
              Änderung abschließen
            </SubmitButton>
          </form>
        )}
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Wortlaut je Markt</h2>
        {change.markets.map((mk) => {
          const w = wordingFor(change, mk);
          return (
            <div key={mk}>
              <div className="mb-1 text-sm font-medium">
                <span className="font-mono">{mk}</span>{" "}
                <span className="text-xs font-normal text-slate-500">{change.localized[mk] ? "lokalisierter Wortlaut" : "Master-Wortlaut"}</span>
              </div>
              <WordingDiff oldText={w.oldText} newText={w.newText} />
            </div>
          );
        })}
      </section>

      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Ausspielorte &amp; Zuordnung ({mappings.length})</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Markt</th>
              <th className="th">Ausspielort</th>
              <th className="th">Quelle</th>
              <th className="th">Erw. Version</th>
              <th className="th">Verantwortlich / Frist</th>
              <th className="th">Status</th>
              <th className="th">Letzter Nachweis</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(({ m, t }) => (
              <tr key={m.id} className={openId === m.id ? "bg-sky-50/60" : "hover:bg-slate-50"}>
                <td className="td font-mono font-semibold">{t.market}</td>
                <td className="td">
                  <Link href={`/changes/${id}?m=${m.id}`} scroll={false} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  <div className="text-xs text-slate-500">{CHANNEL_LABEL[t.channel]}</div>
                </td>
                <td className="td">
                  <SourceCell t={t} />
                </td>
                <td className="td whitespace-nowrap font-mono text-xs">{m.expectedVersionId}</td>
                <td className="td text-xs">
                  {person(m.ownerId)?.name}
                  <div className="text-slate-500">Frist {fmtDate(m.dueDate)}</div>
                </td>
                <td className="td">
                  <StatusBadge status={m.status} />
                  {m.status === "ungeklaert" && <div className="mt-1 text-[11px] text-amber-800">zählt nicht als erledigt</div>}
                </td>
                <td className="td">{evidenceLabel(db, m)}</td>
                <td className="td whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1.5">
                    {t.sourceKind === "url" && !isClosed && (
                      <form action={checkMapping}>
                        <input type="hidden" name="mappingId" value={m.id} />
                        <SubmitButton pendingText="Abruf …">Prüfen</SubmitButton>
                      </form>
                    )}
                    <Link href={`/changes/${id}?m=${m.id}`} scroll={false} className="btn">
                      Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {mappings.length === 0 && (
              <tr>
                <td colSpan={8} className="td text-slate-500">
                  Noch keine Ausspielorte zugeordnet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!isClosed && unmapped.length > 0 && (
          <form action={addMappings} className="border-t border-slate-200 p-4">
            <input type="hidden" name="changeId" value={id} />
            <div className="mb-2 text-sm font-medium">Weitere Ausspielorte zuordnen</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {unmapped.map((t) => (
                <label key={t.id} className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${change.markets.includes(t.market) ? "border-slate-300" : "border-dashed border-slate-200 text-slate-400"}`}>
                  <input type="checkbox" name="targetIds" value={t.id} />
                  <span className="font-mono">{t.market}</span> {t.name}
                </label>
              ))}
            </div>
            <SubmitButton>Zuordnen</SubmitButton>
          </form>
        )}
      </section>

      {open && <MappingDrawer db={db} m={open.m} t={open.t} isClosed={isClosed} />}
    </div>
  );
}

function MappingDrawer({ db, m, t, isClosed }: { db: DB; m: Mapping; t: Target; isClosed: boolean }) {
  const change = db.changes.find((c) => c.id === m.changeId)!;
  const w = wordingFor(change, t.market);
  const entries = db.audit.filter((a) => a.mappingId === m.id);
  return (
    <>
      <Link href={`/changes/${m.changeId}`} scroll={false} className="fixed inset-0 z-10 bg-slate-900/20" aria-label="Schließen" />
      <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <div className="text-xs text-slate-500">
              <span className="font-mono font-semibold">{t.market}</span> · {CHANNEL_LABEL[t.channel]}
            </div>
            <h2 className="font-semibold">{t.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={m.status} />
            <Link href={`/changes/${m.changeId}`} scroll={false} className="btn">
              ✕
            </Link>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Quelle</dt>
            <dd className="break-all">
              {t.sourceKind === "url" ? (
                <a href={t.location} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                  {t.location}
                </a>
              ) : (
                t.location
              )}
            </dd>
            <dt className="text-slate-500">Zugriff</dt>
            <dd>{t.accessNote || "–"}</dd>
            <dt className="text-slate-500">Erwartete Version</dt>
            <dd className="font-mono">{m.expectedVersionId}</dd>
            <dt className="text-slate-500">Status seit</dt>
            <dd>{fmtDateTime(m.statusSince)}</dd>
            <dt className="text-slate-500">Gesuchter neuer Text</dt>
            <dd className="text-xs text-slate-700">„{w.newText}“</dd>
          </dl>

          {t.sourceKind === "manual" ? (
            <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
              <strong>Nicht automatisiert lesbar.</strong> Dieser Ausspielort kann vom System nicht abgerufen werden. Der Status ändert sich ausschließlich durch eine
              manuelle Prüfung mit Prüfer-Notiz oder durch einen hochgeladenen Snapshot/Export.
            </div>
          ) : m.status === "ungeklaert" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Automatischer Abruf ohne verwertbares Ergebnis.</strong> Der Status bleibt „Ungeklärt“ und zählt nicht als erledigt, bis ein neuer Abruf gelingt oder
              eine manuelle Bestätigung mit Beleg bzw. ein Snapshot erfasst wird.
            </div>
          ) : null}

          {!isClosed && (
            <>
              {t.sourceKind === "url" && (
                <form action={checkMapping} className="card flex items-center justify-between gap-3 p-4">
                  <input type="hidden" name="mappingId" value={m.id} />
                  <div className="text-sm">
                    <div className="font-medium">Automatischer Abruf</div>
                    <div className="text-xs text-slate-500">Serverseitiger Abruf (Timeout 12 s) + Textsuche nach altem und neuem Wortlaut.</div>
                  </div>
                  <SubmitButton variant="primary" pendingText="Abruf läuft …">
                    Jetzt prüfen
                  </SubmitButton>
                </form>
              )}

              <details className="card p-4" open={t.sourceKind === "manual" || m.status === "ungeklaert"}>
                <summary className="cursor-pointer text-sm font-medium">Manuelle Prüfung erfassen</summary>
                <div className="mt-3">
                  <ManualCheckForm mappingId={m.id} defaultSource={t.location} />
                </div>
              </details>

              <details className="card p-4">
                <summary className="cursor-pointer text-sm font-medium">Snapshot / Export prüfen</summary>
                <div className="mt-3">
                  <SnapshotForm mappingId={m.id} />
                </div>
              </details>

              <details className="card p-4">
                <summary className="cursor-pointer text-sm font-medium">Zuständigkeit &amp; Frist</summary>
                <form action={reassignMapping} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="mappingId" value={m.id} />
                  <div>
                    <label className="label">Verantwortlich für Austausch</label>
                    <select name="ownerId" defaultValue={m.ownerId} className="input">
                      {db.people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.team})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Frist</label>
                    <input type="date" name="dueDate" defaultValue={m.dueDate ?? ""} className="input" />
                  </div>
                  <SubmitButton>Speichern</SubmitButton>
                </form>
              </details>
            </>
          )}

          <div>
            <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
              Beleg-Log (unveränderlich)
              <span className="text-xs font-normal text-slate-500">{entries.length} Einträge · neueste zuerst</span>
            </h3>
            <AuditTrail entries={entries} />
          </div>
        </div>
      </aside>
    </>
  );
}
