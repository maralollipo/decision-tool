"use client";
import { useActionState, useState } from "react";
import { saveTarget, type FormState } from "@/lib/actions";
import { CHANNEL_LABEL } from "@/lib/labels";
import type { Channel, Market, Person, SourceKind, Target } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";

export function TargetForm({ target, people, markets }: { target?: Target; people: Person[]; markets: Market[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveTarget, {});
  const [kind, setKind] = useState<SourceKind>(target?.sourceKind ?? "url");
  return (
    <form action={action} className="grid gap-3 md:grid-cols-3">
      {target && <input type="hidden" name="id" value={target.id} />}
      {state.error && <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800 md:col-span-3">{state.error}</div>}
      <div className="md:col-span-2">
        <label className="label">Bezeichnung *</label>
        <input name="name" required defaultValue={target?.name} className="input" placeholder="z. B. Produktseite W7 (AT)" />
      </div>
      <div>
        <label className="label">Markt *</label>
        <select name="market" defaultValue={target?.market} className="input">
          {markets.map((m) => <option key={m.code} value={m.code}>{m.code} – {m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Kanal *</label>
        <select name="channel" defaultValue={target?.channel ?? "website"} className="input">
          {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Prüfbare Quelle *</label>
        <select name="sourceKind" value={kind} onChange={(e) => setKind(e.target.value as SourceKind)} className="input">
          <option value="url">Öffentliche URL (automatischer Abruf)</option>
          <option value="manual">Nicht automatisiert lesbar (manuell / Snapshot)</option>
        </select>
      </div>
      <div>
        <label className="label">Kanal-Verantwortliche:r *</label>
        <select name="ownerId" defaultValue={target?.ownerId} className="input">
          {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.team})</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="label">{kind === "url" ? "URL (http/https) *" : "Fundort / Referenz (System, Kampagne, Template) *"}</label>
        <input name="location" required defaultValue={target?.location} className="input" placeholder={kind === "url" ? "https://www.beispiel.de/produkt" : "ESP · Kampagne XY · Template v3"} />
      </div>
      <div>
        <label className="label">Zugriffshinweis</label>
        <input name="accessNote" defaultValue={target?.accessNote} className="input" placeholder="Login, VPN, Agentur …" />
      </div>
      {kind === "manual" && (
        <p className="text-xs text-violet-800 md:col-span-3">
          Für diesen Ausspielort wird kein automatischer Abruf angeboten. Status-Änderungen erfolgen nur über manuelle Prüfung mit Notiz oder einen hochgeladenen Snapshot.
        </p>
      )}
      <div className="md:col-span-3">
        <SubmitButton variant="primary">{target ? "Änderungen speichern" : "Ausspielort anlegen"}</SubmitButton>
      </div>
    </form>
  );
}
