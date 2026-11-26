import { wordDiff } from "@/lib/diff";

export function WordingDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const parts = wordDiff(oldText, newText);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <div className="label">Alter Wortlaut</div>
        <p className="rounded-md border border-red-100 bg-red-50/40 p-2.5 text-sm leading-relaxed">
          {parts.filter((p) => p.op !== "add").map((p, i) => (p.op === "del" ? <del key={i} className="bg-red-200/70 text-red-900 decoration-red-500">{p.text}</del> : <span key={i}>{p.text}</span>))}
        </p>
      </div>
      <div>
        <div className="label">Neuer Wortlaut</div>
        <p className="rounded-md border border-emerald-100 bg-emerald-50/40 p-2.5 text-sm leading-relaxed">
          {parts.filter((p) => p.op !== "del").map((p, i) => (p.op === "add" ? <ins key={i} className="bg-emerald-200/70 text-emerald-900 no-underline">{p.text}</ins> : <span key={i}>{p.text}</span>))}
        </p>
      </div>
    </div>
  );
}
