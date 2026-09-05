import type { PlanningBlock } from "../../services/mock/blockPlannerData";

const impactStyles = {
  Low: "border-emerald-200 bg-emerald-100 text-emerald-800",
  Medium: "border-amber-200 bg-amber-100 text-amber-800",
  High: "border-red-200 bg-red-100 text-red-800",
  Approved: "border-blue-200 bg-blue-100 text-blue-800",
};

export function GanttBlock({
  block,
  left,
  width,
  selected,
  onSelect,
}: {
  block: PlanningBlock;
  left: number;
  width: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(block.id)}
      className={[
        "absolute top-1 flex h-9 items-center justify-center rounded-md border px-2 text-[10px] font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
        impactStyles[block.impact],
        selected ? "ring-2 ring-blue-300 ring-offset-1" : "",
      ].join(" ")}
      style={{ left: `${left}%`, width: `${width}%` }}
      aria-label={`Select block ${block.id}`}
    >
      <span className="truncate">{block.id}</span>
    </button>
  );
}
