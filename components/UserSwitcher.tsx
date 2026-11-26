"use client";
import { setUser } from "@/lib/actions";
import type { Person } from "@/lib/types";

export function UserSwitcher({ people, currentId }: { people: Person[]; currentId: string }) {
  return (
    <form action={setUser} className="flex items-center gap-2 text-xs text-slate-300">
      <label htmlFor="userId">Handelnde Person:</label>
      <select
        id="userId"
        name="userId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-slate-600 bg-slate-800 px-1.5 py-1 text-xs text-white"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} – {p.team}
          </option>
        ))}
      </select>
    </form>
  );
}
