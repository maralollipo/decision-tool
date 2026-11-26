import { STATUS_LABEL } from "@/lib/labels";
import type { Counts } from "@/lib/stats";
import type { MappingStatus } from "@/lib/types";
import { STATUS_BAR_COLOR } from "./StatusBadge";

const ORDER: MappingStatus[] = ["aktuell", "altfassung", "ungeklaert", "ausstehend"];

export function ProgressBar({ counts, showLegend = true }: { counts: Counts; showLegend?: boolean }) {
  const pct = counts.total ? Math.round((counts.aktuell / counts.total) * 100) : 0;
  return (
    <div className="min-w-56">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {ORDER.map((s) =>
          counts[s] ? (
            <div key={s} className={STATUS_BAR_COLOR[s]} style={{ width: `${(counts[s] / counts.total) * 100}%` }} title={`${STATUS_LABEL[s]}: ${counts[s]}`} />
          ) : null,
        )}
      </div>
      {showLegend && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{pct}% aktuell</span>
          {ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BAR_COLOR[s]}`} />
              {counts[s]} {STATUS_LABEL[s].split(" /")[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
