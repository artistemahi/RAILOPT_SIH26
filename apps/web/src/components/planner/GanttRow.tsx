import { GanttBlock } from "./GanttBlock";
import type { GanttRow as GanttRowType } from "../../services/mock/blockPlannerData";

const startHour = 0;
const endHour = 24;
const totalHours = endHour - startHour;

export function GanttRow({
  row,
  selectedId,
  onSelect,
}: {
  row: GanttRowType;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] border-b border-slate-200 last:border-b-0">
      <div className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-700">
        <span className="font-medium">{row.label}</span>
        <span className="text-slate-400">{row.section}</span>
      </div>

      <div className="relative h-14 bg-white">
        <div className="absolute inset-0 grid grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border-l border-slate-200" />
          ))}
        </div>

        {row.blocks.map((block) => {
          const left = ((block.startHour - startHour) / totalHours) * 100;
          const width = ((block.endHour - block.startHour) / totalHours) * 100;

          return (
            <GanttBlock
              key={block.id}
              block={block}
              left={left}
              width={width}
              selected={selectedId === block.id}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
