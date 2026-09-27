import type { SelectedBlock } from "../../types/planner";

const impactBadge = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function SelectedBlockDetails({ block }: { block: SelectedBlock }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Selected Window Details
        </div>
        <span className="text-[10px] text-slate-400">Pre-optimization</span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-slate-800">
          {block.id}
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${impactBadge[block.trainImpact]}`}
        >
          {block.trainImpact} Impact
        </span>
      </div>

      <div className="space-y-3 text-[12px] text-slate-600">
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Window ID</span>
          <span className="text-right font-medium text-slate-800">
            {block.id}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Section</span>
          <span className="text-right font-medium text-slate-800">
            {block.section}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Time Window</span>
          <span className="text-right font-medium text-slate-800">
            {block.timeWindow}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Duration</span>
          <span className="text-right font-medium text-slate-800">
            {block.duration}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Candidate Tasks</span>
          <span className="text-right font-medium text-slate-800">
            {block.tasksScheduled}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Train Impact</span>
          <span className="text-right font-medium text-slate-800">
            {block.trainImpact}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Priority Coverage</span>
          <span className="text-right font-medium text-slate-800">
            {block.priorityCoverage}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Window Status</span>
          <span className="text-right font-medium text-slate-800">
            {block.blockStatus}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <span className="text-slate-500">Reason</span>
          <span className="text-right font-medium text-slate-800">
            {block.reason}
          </span>
        </div>
      </div>

    </div>
  );
}
