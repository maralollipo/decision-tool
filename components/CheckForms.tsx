"use client";
import { useActionState, useRef } from "react";
import { manualCheck, snapshotCheck, type FormState } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

export function ManualCheckForm({ mappingId, defaultSource }: { mappingId: string; defaultSource: string }) {
  const [state, action] = useActionState<FormState, FormData>(async (p, fd) => {
    const r = await manualCheck(p, fd);
    if (!r.error) formRef.current?.reset();
    return r;
  }, {});
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="mappingId" value={mappingId} />
      {state.error && <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">{state.error}</div>}
      <div>
        <label className="label">Prüfergebnis *</label>
        <div className="flex flex-wrap gap-2 text-sm">
          <label className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1"><input type="radio" name="statusTo" value="altfassung" required /> Altfassung gesehen</label>
          <label className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1"><input type="radio" name="statusTo" value="aktuell" /> Neuer Wortlaut nachgewiesen</label>
          <label className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1"><input type="radio" name="statusTo" value="ungeklaert" /> Weiterhin ungeklärt</label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Geprüfte Quelle / Fundort</label>
          <input name="source" className="input" defaultValue={defaultSource} />
        </div>
        <div>
          <label className="label">Zeitpunkt der Prüfung (falls nicht jetzt)</label>
          <input type="datetime-local" name="checkedAt" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Beleg-Referenz (Screenshot-Link, Export, Ticket) – Pflicht bei „nachgewiesen“</label>
        <input name="evidenceRef" className="input" placeholder="https://sharepoint…/screenshot.png oder MKT-1234" />
      </div>
      <div>
        <label className="label">Prüfer-Notiz *</label>
        <textarea name="note" rows={2} className="input" placeholder="Was wurde wie geprüft? z. B. „Testversand an Prüfpostfach, Footer kontrolliert“" />
      </div>
      <SubmitButton variant="primary" pendingText="Wird protokolliert …">
        Manuelle Prüfung protokollieren
      </SubmitButton>
    </form>
  );
}

export function SnapshotForm({ mappingId }: { mappingId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<FormState, FormData>(async (p, fd) => {
    const r = await snapshotCheck(p, fd);
    if (!r.error) formRef.current?.reset();
    return r;
  }, {});
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="mappingId" value={mappingId} />
      {state.error && <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">{state.error}</div>}
      <div>
        <label className="label">Snapshot/Export hochladen (HTML, PDF, TXT, EML)</label>
        <input type="file" name="file" accept=".html,.htm,.pdf,.txt,.eml,text/*,application/pdf" className="input" />
      </div>
      <div>
        <label className="label">… oder Text-Export einfügen</label>
        <textarea name="pasted" rows={2} className="input font-mono text-xs" />
      </div>
      <div>
        <label className="label">Herkunft des Snapshots *</label>
        <input name="note" className="input" placeholder="z. B. HTML-Export Template v12 aus ESP, 26.11." />
      </div>
      <SubmitButton pendingText="Wird ausgewertet …">Snapshot auswerten &amp; protokollieren</SubmitButton>
      <p className="text-xs text-slate-500">Die Datei wird mit SHA-256-Hash abgelegt und mit derselben Textsuche wie der automatische Abruf ausgewertet.</p>
    </form>
  );
}
