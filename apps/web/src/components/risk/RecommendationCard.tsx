export function RecommendationCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Recommended Action
      </div>
      <div className="text-[13px] font-medium text-slate-800">
        Prioritize for the next feasible maintenance window.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Risk Level</div>
          <div className="mt-1 font-semibold text-red-700">Critical</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Urgency</div>
          <div className="mt-1 font-semibold text-amber-700">High</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Operational Impact</div>
          <div className="mt-1 font-semibold text-emerald-700">High</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-500">Planning Implication</div>
          <div className="mt-1 font-semibold text-slate-800">
            Reschedule Needed
          </div>
        </div>
      </div>
    </div>
  );
}
