"use client";
import { useActionState, useState } from "react";
import { createChange, type FormState } from "@/lib/actions";
import type { Market, Person } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";

export function ChangeForm({ people, markets, defaultOwner, targetCounts }: { people: Person[]; markets: Market[]; defaultOwner: string; targetCounts: Record<string, number> }) {
  const [state, action] = useActionState<FormState, FormData>(createChange, {});
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (code: string) => setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));

  return (
    <form action={action} className="space-y-5">
      {state.error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</div>}

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold">Stammdaten</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="label">Titel *</label>
            <input name="title" required className="input" placeholder="z. B. Pflichthinweis Energielabel W7 aktualisiert" />
          </div>
          <div>
            <label className="label">Typ *</label>
            <select name="type" className="input" defaultValue="pflichttext">
              <option value="pflichttext">Pflichttext</option>
              <option value="claim">Claim</option>
            </select>
          </div>
          <div>
            <label className="label">Alte Versions-ID</label>
            <input name="oldVersionId" className="input font-mono" placeholder="PT-XYZ-2026.1" />
          </div>
          <div>
            <label className="label">Neue Versions-ID *</label>
            <input name="versionId" required className="input font-mono" placeholder="PT-XYZ-2026.2" />
          </div>
          <div>
            <label className="label">Gültig ab *</label>
            <input type="date" name="effectiveDate" required className="input" />
          </div>
          <div>
            <label className="label">Owner (verantwortlich) *</label>
            <select name="ownerId" className="input" defaultValue={defaultOwner}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.team})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Beschreibung / Freigabe-Referenz</label>
            <input name="description" className="input" placeholder="Freigabe Legal vom …, Anlass …" />
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold">Wortlaut (Master)</h2>
        <p className="text-xs text-slate-500">
          Der Abgleich erfolgt als exakte Textsuche nach Normalisierung (Groß-/Kleinschreibung, Leerraum, typografische Anführungszeichen und Gedankenstriche werden vereinheitlicht).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Alter Wortlaut *</label>
            <textarea name="oldText" required rows={4} className="input" />
          </div>
          <div>
            <label className="label">Neuer Wortlaut *</label>
            <textarea name="newText" required rows={4} className="input" />
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold">Betroffene Märkte *</h2>
        <div className="flex flex-wrap gap-3">
          {markets.map((m) => (
            <label key={m.code} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm">
              <input type="checkbox" name="markets" value={m.code} checked={selected.includes(m.code)} onChange={() => toggle(m.code)} />
              <span className="font-mono font-semibold">{m.code}</span> {m.name}
              <span className="text-xs text-slate-400">({targetCounts[m.code] ?? 0} Ausspielorte)</span>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoMap" defaultChecked /> Alle Ausspielorte der gewählten Märkte direkt zuordnen
        </label>
        {selected.map((code) => (
          <details key={code} className="rounded-md border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">Lokalisierter Wortlaut für {code} (optional – sonst gilt der Master-Wortlaut)</summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Alter Wortlaut {code}</label>
                <textarea name={`old_${code}`} rows={3} className="input" />
              </div>
              <div>
                <label className="label">Neuer Wortlaut {code}</label>
                <textarea name={`new_${code}`} rows={3} className="input" />
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="flex justify-end">
        <SubmitButton variant="primary" pendingText="Wird angelegt …">
          Änderung anlegen
        </SubmitButton>
      </div>
    </form>
  );
}
