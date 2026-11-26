import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { readDb } from "@/lib/db";
import { TYPE_LABEL, fmtDate } from "@/lib/labels";
import { countStatuses } from "@/lib/stats";

export default function ChangeLogPage() {
  const db = readDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.changes.map((c) => ({ c, counts: countStatuses(db, c.id), owner: db.people.find((p) => p.id === c.ownerId) }));
  const totals = rows.reduce(
    (a, r) => ({ altfassung: a.altfassung + r.counts.altfassung, ungeklaert: a.ungeklaert + r.counts.ungeklaert, ausstehend: a.ausstehend + r.counts.ausstehend }),
    { altfassung: 0, ungeklaert: 0, ausstehend: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Änderungen (Change Log)</h1>
          <p className="text-sm text-slate-500">Freigegebene Claim- und Pflichttext-Änderungen und ihr Austauschstatus je Ausspielort.</p>
        </div>
        <Link href="/changes/new" className="btn-primary">
          + Neue Änderung
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/tasks?status=altfassung" className="card p-4 hover:border-red-300">
          <div className="text-2xl font-semibold text-red-700">{totals.altfassung}</div>
          <div className="text-sm text-slate-600">Ausspielorte liefern noch die Altfassung aus</div>
        </Link>
        <Link href="/tasks?status=ungeklaert" className="card p-4 hover:border-amber-300">
          <div className="text-2xl font-semibold text-amber-700">{totals.ungeklaert}</div>
          <div className="text-sm text-slate-600">ungeklärt – manuelle Prüfung/Beleg nötig</div>
        </Link>
        <Link href="/tasks?status=ausstehend" className="card p-4 hover:border-slate-400">
          <div className="text-2xl font-semibold text-slate-700">{totals.ausstehend}</div>
          <div className="text-sm text-slate-600">noch nicht geprüft</div>
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Änderung</th>
              <th className="th">Typ</th>
              <th className="th">Version</th>
              <th className="th">Gültig ab</th>
              <th className="th">Märkte</th>
              <th className="th">Owner</th>
              <th className="th">Fortschritt ({"Ausspielorte"})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, counts, owner }) => {
              const overdue = !c.closedAt && c.effectiveDate <= today && counts.aktuell < counts.total;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/changes/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.title}
                    </Link>
                    <div className="mt-0.5 flex gap-1.5">
                      {c.closedAt ? (
                        <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">abgeschlossen</span>
                      ) : (
                        <span className="rounded bg-sky-100 px-1.5 text-xs text-sky-800">in Umsetzung</span>
                      )}
                      {overdue && <span className="rounded bg-red-100 px-1.5 text-xs text-red-800">Gültigkeit erreicht, nicht vollständig umgesetzt</span>}
                    </div>
                  </td>
                  <td className="td">{TYPE_LABEL[c.type]}</td>
                  <td className="td font-mono text-xs">
                    <span className="text-slate-400 line-through">{c.oldVersionId || "–"}</span>
                    <br />
                    {c.versionId}
                  </td>
                  <td className="td whitespace-nowrap">{fmtDate(c.effectiveDate)}</td>
                  <td className="td">{c.markets.join(", ")}</td>
                  <td className="td whitespace-nowrap">{owner?.name}</td>
                  <td className="td">
                    <ProgressBar counts={counts} />
                    <div className="mt-0.5 text-xs text-slate-400">{counts.total} Ausspielorte</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={7}>
                  Noch keine Änderungen erfasst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
