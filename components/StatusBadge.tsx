import { STATUS_HINT, STATUS_LABEL } from "@/lib/labels";
import type { MappingStatus } from "@/lib/types";

const STYLES: Record<MappingStatus, string> = {
  ausstehend: "bg-slate-100 text-slate-700 ring-slate-300",
  altfassung: "bg-red-50 text-red-700 ring-red-300",
  aktuell: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  ungeklaert: "bg-amber-50 text-amber-800 ring-amber-300",
};
const DOT: Record<MappingStatus, string> = {
  ausstehend: "bg-slate-400",
  altfassung: "bg-red-500",
  aktuell: "bg-emerald-500",
  ungeklaert: "bg-amber-500",
};

export function StatusBadge({ status }: { status: MappingStatus }) {
  return (
    <span
      title={STATUS_HINT[status]}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const STATUS_BAR_COLOR = DOT;
