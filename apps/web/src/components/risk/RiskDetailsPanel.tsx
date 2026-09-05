import type { RiskDetails } from "../../types/risk";
import { RiskFactors } from "./RiskFactors";
import { RecommendationCard } from "./RecommendationCard";

export function RiskDetailsPanel({ details }: { details: RiskDetails }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Selected Asset
        </div>
        <button
          type="button"
          className="text-[11px] font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          Collapse
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-slate-800">
          {details.assetId}
        </div>
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-700">
          {details.priority} - Critical
        </span>
      </div>

      <div className="space-y-3 text-[12px] text-slate-600">
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Task</span>
          <span className="text-right font-medium text-slate-800">
            {details.task}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Department</span>
          <span className="text-right font-medium text-slate-800">
            {details.department}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Section</span>
          <span className="text-right font-medium text-slate-800">
            {details.section}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Risk Probability</span>
          <span className="text-right font-medium text-slate-800">
            {details.riskProbability}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Priority</span>
          <span className="text-right font-medium text-slate-800">
            {details.priority}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Criticality</span>
          <span className="text-right font-medium text-slate-800">
            {details.criticality}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <span className="text-slate-500">Overdue Days</span>
          <span className="text-right font-medium text-slate-800">
            {details.overdueDays}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <span className="text-slate-500">Condition</span>
          <span className="text-right font-medium text-slate-800">
            {details.condition}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="mb-3 text-[12px] font-semibold text-slate-800">
          Why is this risky?
        </div>
        <RiskFactors factors={details.factors} />
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <RecommendationCard />
      </div>
    </div>
  );
}
