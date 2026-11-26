"use client";
import { resetDemo } from "@/lib/actions";

export function ResetDemoButton() {
  return (
    <form
      action={resetDemo}
      onSubmit={(e) => {
        if (!confirm("Alle Daten inkl. Beleg-Log auf die Beispieldaten zurücksetzen?")) e.preventDefault();
      }}
    >
      <button className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-white/10" title="Datenbank auf Beispieldaten zurücksetzen">
        Demo zurücksetzen
      </button>
    </form>
  );
}
