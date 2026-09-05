import type { PriorityLevel } from "../../types/risk";

const priorityStyles: Record<PriorityLevel, string> = {
  P1: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200",
  P2: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200",
  P3: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export function RiskBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span
      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[priority]}`}
    >
      {priority}
    </span>
  );
}
