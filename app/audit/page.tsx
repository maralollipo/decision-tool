import Link from "next/link";
import { AuditTrail } from "@/components/AuditTrail";
import { verifyChain } from "@/lib/audit-hash";
import { readDb } from "@/lib/db";

export default function AuditPage() {
  const db = readDb();
  const chain = verifyChain(db.audit);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Beleg-Log (gesamt)</h1>
        <p className="text-sm text-slate-500">
          Nur-Anhängen-Protokoll aller Prüfungen und Statuswechsel. Jeder Eintrag enthält den SHA-256-Hash seines Vorgängers; nachträgliche Änderungen an der Datenbankdatei werden hier sichtbar.
        </p>
      </div>
      <div className={`card p-4 text-sm ${chain.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>
        <strong>{chain.ok ? "✔ Integrität bestätigt" : "✖ Integrität verletzt"}</strong> – {chain.message} ({chain.entries} Einträge)
      </div>
      <AuditTrail
        entries={db.audit}
        showTarget={(e) => {
          const t = db.targets.find((x) => x.id === e.targetId);
          const c = db.changes.find((x) => x.id === e.changeId);
          return (
            <Link href={`/changes/${e.changeId}?m=${e.mappingId}`} className="hover:underline">
              {t?.market} · {t?.name} — {c?.title}
            </Link>
          );
        }}
      />
    </div>
  );
}
