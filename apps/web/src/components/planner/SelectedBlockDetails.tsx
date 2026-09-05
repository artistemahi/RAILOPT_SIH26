import type { SelectedBlock } from "../../services/mock/blockPlannerData";

export function SelectedBlockDetails({ block }: { block: SelectedBlock }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Selected Block Details
        </div>
        <button
          type="button"
          className="text-[11px] text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          Clear
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-slate-800">
          {block.id}
        </div>
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-700">
          {block.trainImpact} Impact
        </span>
      </div>

      <div className="space-y-3 text-[12px] text-slate-600">
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Block ID</span>
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
          <span className="text-slate-500">Tasks Scheduled</span>
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
        <div className="grid grid-cols-2 gap-3 pb-2">
          <span className="text-slate-500">Reason</span>
          <span className="text-right font-medium text-slate-800">
            {block.reason}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        View Tasks in Block
      </button>
    </div>
  );
}
