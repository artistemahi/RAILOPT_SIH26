import type { RecommendedBlock } from "../../types/dashboard";
import { InfoIcon } from "./icons";

export function RecommendationCard({
  recommendation,
}: {
  recommendation: RecommendedBlock;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-slate-800">
          Recommended Block
        </h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
          Demo
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
              Block ID
            </div>
            <div className="mt-1 text-[26px] font-semibold leading-none text-blue-700">
              {recommendation.blockId}
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
            <InfoIcon />
            <span>{recommendation.compatibleTasks} Compatible Tasks</span>
          </div>
        </div>

        <div className="space-y-2 text-[12px] text-slate-600">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500">Corridor</span>
            <span className="font-semibold text-slate-800">
              {recommendation.corridor}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500">Time Window</span>
            <span className="font-semibold text-slate-800">
              {recommendation.timeWindow}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-slate-500">Estimated Duration</span>
            <span className="font-semibold text-slate-800">
              {recommendation.durationHours}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-[9px] text-slate-600">
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Train Impact</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Priority</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span>{recommendation.compatibleTasks} tasks</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-1 w-full rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          View Plan
        </button>
      </div>
    </div>
  );
}
