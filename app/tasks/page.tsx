import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { readDb } from "@/lib/db";
import { AUDIT_KIND_LABEL, CHANNEL_LABEL, STATUS_LABEL, STATUS_ORDER, fmtDate, fmtDateTime } from "@/lib/labels";
import type { Channel, MappingStatus } from "@/lib/types";

type SP = { market?: string; channel?: string; status?: string; owner?: string; change?: string; all?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const db = readDb();
  const today = new Date().toISOString().slice(0, 10);
  const showDone = sp.all === "1";

  const rows = db.mappings
    .map((m) => ({ m, t: db.targets.find((t) => t.id === m.targetId)!, c: db.changes.find((c) => c.id === m.changeId)! }))
    .filter(({ c }) => !c.closedAt)
    .filter(({ m }) => showDone || m.status !== "aktuell")
    .filter(({ t }) => !sp.market || t.market === sp.market)
    .filter(({ t }) => !sp.channel || t.channel === sp.channel)
    .filter(({ m }) => !sp.status || m.status === sp.status)
    .filter(({ m }) => !sp.owner || m.ownerId === sp.owner)
    .filter(({ c }) => !sp.change || c.id === sp.change)
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.m.status) - STATUS_ORDER.indexOf(b.m.status) ||
        (a.m.dueDate ?? "9999").localeCompare(b.m.dueDate ?? "9999") ||
        a.t.market.localeCompare(b.t.market),
    );

  const markets = [...new Set(db.targets.map((t) => t.market))].sort();
  const channels = [...new Set(db.targets.map((t) => t.channel))] as Channel[];
  const person = (id: string) => db.people.find((p) => p.id === id);

  const actionHint = (status: MappingStatus, manual: boolean) => {
    switch (status) {
      case "altfassung":
        return "Austausch veranlassen, danach erneut prüfen";
      case "ungeklaert":
        return manual ? "Export/Testversand beschaffen oder manuell bestätigen" : "Zugriff klären oder manuell mit Beleg bestätigen";
      case "ausstehend":
        return manual ? "Manuelle Prüfung durchführen" : "Automatischen Abruf starten";
      default:
        return "–";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Aufgaben &amp; Eskalation</h1>
        <p className="text-sm text-slate-500">Offene Ausspielorte aller laufenden Änderungen. Überfällige Einträge (Frist überschritten) sind rot markiert.</p>
      </div>

      <form className="card no-print flex flex-wrap items-end gap-3 p-3" method="get">
        <div>
          <label className="label">Markt</label>
          <select name="market" defaultValue={sp.market ?? ""} className="input">
            <option value="">alle</option>
            {markets.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kanal</label>
          <select name="channel" defaultValue={sp.channel ?? ""} className="input">
            <option value="">alle</option>
            {channels.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">alle offenen</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Verantwortlich</label>
          <select name="owner" defaultValue={sp.owner ?? ""} className="input">
            <option value="">alle</option>
            {db.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Änderung</label>
          <select name="change" defaultValue={sp.change ?? ""} className="input max-w-64">
            <option value="">alle</option>
            {db.changes.filter((c) => !c.closedAt).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 pb-1.5 text-sm">
          <input type="checkbox" name="all" value="1" defaultChecked={showDone} /> auch erledigte
        </label>
        <button className="btn-primary">Filtern</button>
        <Link href="/tasks" className="btn">Zurücksetzen</Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Status</th>
              <th className="th">Markt / Kanal</th>
              <th className="th">Ausspielort</th>
              <th className="th">Änderung</th>
              <th className="th">Verantwortlich</th>
              <th className="th">Frist</th>
              <th className="th">Letzte Prüfung</th>
              <th className="th">Nächster Schritt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, t, c }) => {
              const overdue = m.status !== "aktuell" && !!m.dueDate && m.dueDate < today;
              const p = person(m.ownerId);
              return (
                <tr key={m.id} className={overdue ? "bg-red-50/50" : "hover:bg-slate-50"}>
                  <td className="td"><StatusBadge status={m.status} /></td>
                  <td className="td">
                    <span className="font-mono font-semibold">{t.market}</span>
                    <div className="text-xs text-slate-500">{CHANNEL_LABEL[t.channel]}</div>
                  </td>
                  <td className="td">
                    <Link href={`/changes/${c.id}?m=${m.id}`} className="font-medium hover:underline">{t.name}</Link>
                    {t.sourceKind === "manual" && <div className="text-[11px] text-violet-700">nur manuell prüfbar</div>}
                  </td>
                  <td className="td text-xs">{c.title}<div className="font-mono text-slate-500">{c.versionId}</div></td>
                  <td className="td text-xs">
                    {p?.name}
                    {p && (
                      <a className="block text-sky-700 hover:underline" href={`mailto:${p.email}?subject=${encodeURIComponent(`[${STATUS_LABEL[m.status]}] ${t.market} ${t.name} – ${c.versionId}`)}`}>
                        {p.email}
                      </a>
                    )}
                  </td>
                  <td className={`td whitespace-nowrap text-xs ${overdue ? "font-semibold text-red-700" : ""}`}>
                    {fmtDate(m.dueDate)}
                    {overdue && <div>überfällig</div>}
                  </td>
                  <td className="td text-xs">
                    {m.lastCheckKind ? <>{AUDIT_KIND_LABEL[m.lastCheckKind]}<div className="text-slate-500">{fmtDateTime(m.lastCheckAt)}</div></> : <span className="text-slate-400">nie</span>}
                  </td>
                  <td className="td text-xs">{actionHint(m.status, t.sourceKind === "manual")}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="td text-slate-500">Keine offenen Aufgaben für diese Filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{rows.length} Einträge</p>
    </div>
  );
}
