import type { PriorityLevel } from "../../types/dashboard";

const priorityStyles: Record<PriorityLevel, string> = {
  P1: "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200",
  P2: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200",
  P3: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export function RiskBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-semibold ${priorityStyles[priority]}`}
    >
      {priority}
    </span>
  );
}
