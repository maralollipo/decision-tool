import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { TargetForm } from "@/components/TargetForm";
import { setDemoPage } from "@/lib/actions";
import { readDb } from "@/lib/db";
import { CHANNEL_LABEL, SOURCE_KIND_LABEL } from "@/lib/labels";

export default async function TargetsPage({ searchParams }: { searchParams: Promise<{ edit?: string; market?: string }> }) {
  const sp = await searchParams;
  const db = readDb();
  const editing = sp.edit ? db.targets.find((t) => t.id === sp.edit) : undefined;
  const targets = db.targets
    .filter((t) => !sp.market || t.market === sp.market)
    .sort((a, b) => a.market.localeCompare(b.market) || a.channel.localeCompare(b.channel));
  const demoPaths = Object.keys(db.demo.pages);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Ausspielorte</h1>
        <p className="text-sm text-slate-500">Veröffentlichte Ausspielorte je Markt und Kanal, mit prüfbarer Quelle und Kanal-Verantwortlichen.</p>
      </div>

      <div className="flex gap-1.5 text-sm">
        <Link href="/targets" className={`rounded px-2 py-1 ${!sp.market ? "bg-slate-800 text-white" : "bg-white ring-1 ring-slate-200"}`}>alle</Link>
        {db.markets.map((m) => (
          <Link key={m.code} href={`/targets?market=${m.code}`} className={`rounded px-2 py-1 font-mono ${sp.market === m.code ? "bg-slate-800 text-white" : "bg-white ring-1 ring-slate-200"}`}>
            {m.code}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Markt</th>
              <th className="th">Ausspielort</th>
              <th className="th">Kanal</th>
              <th className="th">Quelle</th>
              <th className="th">Verantwortlich</th>
              <th className="th">Laufende Zuordnungen</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => {
              const maps = db.mappings.filter((m) => m.targetId === t.id && !db.changes.find((c) => c.id === m.changeId)?.closedAt);
              return (
                <tr key={t.id} className={editing?.id === t.id ? "bg-sky-50/60" : "hover:bg-slate-50"}>
                  <td className="td font-mono font-semibold">{t.market}</td>
                  <td className="td font-medium">{t.name}<div className="text-xs font-normal text-slate-500">{t.accessNote}</div></td>
                  <td className="td text-xs">{CHANNEL_LABEL[t.channel]}</td>
                  <td className="td text-xs">
                    <div className={t.sourceKind === "url" ? "text-sky-800" : "text-violet-800"}>{SOURCE_KIND_LABEL[t.sourceKind]}</div>
                    {t.sourceKind === "url" ? (
                      <a href={t.location} target="_blank" rel="noreferrer" className="break-all text-sky-700 hover:underline">{t.location}</a>
                    ) : (
                      <span className="text-slate-500">{t.location}</span>
                    )}
                  </td>
                  <td className="td text-xs">{db.people.find((p) => p.id === t.ownerId)?.name}</td>
                  <td className="td">
                    <div className="flex flex-col gap-1">
                      {maps.map((m) => (
                        <Link key={m.id} href={`/changes/${m.changeId}?m=${m.id}`} className="flex items-center gap-1.5 text-xs hover:underline">
                          <StatusBadge status={m.status} /> <span className="font-mono text-slate-500">{m.expectedVersionId}</span>
                        </Link>
                      ))}
                      {maps.length === 0 && <span className="text-xs text-slate-400">–</span>}
                    </div>
                  </td>
                  <td className="td text-right"><Link href={`/targets?edit=${t.id}`} className="btn">Bearbeiten</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{editing ? `Ausspielort bearbeiten: ${editing.name}` : "Neuen Ausspielort anlegen"}</h2>
          {editing && <Link href="/targets" className="text-sm text-slate-500 hover:underline">Abbrechen</Link>}
        </div>
        <TargetForm key={editing?.id ?? "new"} target={editing} people={db.people} markets={db.markets} />
      </div>

      <div className="card border-dashed p-5">
        <h2 className="font-semibold">Demo-Steuerung</h2>
        <p className="mb-3 text-xs text-slate-500">
          Simuliert den Austausch auf den eingebauten Demo-Ausspielorten (/demo/…). Danach „Prüfen“ in der Änderung auslösen, um den Statuswechsel im Beleg-Log zu sehen.
        </p>
        <div className="space-y-2">
          {demoPaths.map((p) => (
            <form key={p} action={setDemoPage} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="path" value={p} />
              <a href={p} target="_blank" rel="noreferrer" className="min-w-80 font-mono text-xs text-sky-700 hover:underline">{p}</a>
              <span className="text-xs">liefert aus: <strong>{db.demo.pages[p] === "neu" ? "Neufassung" : "Altfassung"}</strong></span>
              <input type="hidden" name="state" value={db.demo.pages[p] === "neu" ? "alt" : "neu"} />
              <SubmitButton>{db.demo.pages[p] === "neu" ? "auf Altfassung zurücksetzen" : "Austausch simulieren (Neufassung)"}</SubmitButton>
              {p.includes("portail") && <span className="text-xs text-amber-700">(antwortet immer mit HTTP 403 – Login-Schutz)</span>}
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
