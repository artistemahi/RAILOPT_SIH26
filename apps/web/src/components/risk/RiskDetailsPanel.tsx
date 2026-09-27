import type { RiskDetails } from "../../types/risk";
import { RiskFactors } from "./RiskFactors";
import { RecommendationCard } from "./RecommendationCard";

const levelBadge = {
  P1: "border-red-200 bg-red-50 text-red-700",
  P2: "border-amber-200 bg-amber-50 text-amber-700",
  P3: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function RiskDetailsPanel({ details }: { details: RiskDetails }) {
  const rows: Array<[string, string]> = [
    ["Asset", details.assetId],
    ["Task", details.task],
    ["Department", details.department],
    ["Section", details.section],
    [
      "Priority Score",
      `${details.priorityScore} (${details.scoreSource === "ML" ? "ML final score" : "dataset score"})`,
    ],
    ["Overdue Days", String(details.overdueDays)],
    ["Asset Condition", details.condition],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
        Selected Task
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-slate-800">
          {details.taskId}
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${levelBadge[details.priority]}`}
        >
          {details.priority} - {details.riskLevel}
        </span>
      </div>

      <div className="space-y-3 text-[12px] text-slate-600">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2 last:border-b-0"
          >
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-medium text-slate-800">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="mb-1 text-[12px] font-semibold text-slate-800">
          Priority inputs
        </div>
        <p className="mb-3 text-[10px] text-slate-500">
          Dataset values for this task and asset (0–100). These feed the priority
          score; they are not model explanations.
        </p>
        <RiskFactors factors={details.factors} />
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <RecommendationCard details={details} />
      </div>
    </div>
  );
}
