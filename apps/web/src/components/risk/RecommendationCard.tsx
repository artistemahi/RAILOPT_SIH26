import type { RiskDetails } from "../../types/risk";

export function RecommendationCard({ details }: { details: RiskDetails }) {
  const action =
    details.priority === "P1"
      ? "Consider for the earliest feasible block window."
      : details.priority === "P2"
        ? "Plan within the current horizon if a window fits."
        : "Can be planned after higher-priority work.";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Planning Guidance
      </div>
      <div className="text-[13px] font-medium text-slate-800">{action}</div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Priority Level</div>
          <div className="mt-1 font-semibold text-slate-800">
            {details.riskLevel}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Urgency Band</div>
          <div className="mt-1 font-semibold text-slate-800">
            {details.urgency}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Task Status</div>
          <div className="mt-1 font-semibold text-slate-800">
            {details.taskStatus}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Overdue</div>
          <div className="mt-1 font-semibold text-slate-800">
            {details.overdueDays ? `${details.overdueDays} day(s)` : "No"}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-500">
        Guidance is a priority band, not a schedule. Block assignment is decided
        by the planner.
      </p>
    </div>
  );
}
