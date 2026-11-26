import Link from "next/link";
import { ChangeForm } from "@/components/ChangeForm";
import { readDb } from "@/lib/db";
import { currentUser } from "@/lib/session";

export default async function NewChangePage() {
  const db = readDb();
  const user = await currentUser(db);
  const targetCounts: Record<string, number> = {};
  for (const t of db.targets) targetCounts[t.market] = (targetCounts[t.market] ?? 0) + 1;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Änderungen
      </Link>
      <h1 className="text-xl font-semibold">Neue Änderung anlegen</h1>
      <ChangeForm people={db.people} markets={db.markets} defaultOwner={user.id} targetCounts={targetCounts} />
    </div>
  );
}
