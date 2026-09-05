import { GanttRow } from "./GanttRow";
import type { GanttRow as GanttRowType } from "../../services/mock/blockPlannerData";

export function GanttChart({
  rows,
  selectedId,
  onSelect,
}: {
  rows: GanttRowType[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            Block Schedule (Gantt View)
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[9px] text-slate-500">
              i
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1"
            >
              Zoom Out
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1"
            >
              Zoom In
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[130px_1fr] border-b border-slate-200 bg-slate-50">
            <div className="px-2 py-2 text-[10px] uppercase tracking-[0.08em] text-slate-500">
              Section / Station
            </div>
            <div className="grid grid-cols-6 border-l border-slate-200">
              {[
                "00:00",
                "04:00",
                "08:00",
                "12:00",
                "16:00",
                "20:00",
                "24:00",
              ].map((label) => (
                <div
                  key={label}
                  className="px-2 py-2 text-center text-[10px] font-medium text-slate-500"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {rows.map((row) => (
            <GanttRow
              key={row.id}
              row={row}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
