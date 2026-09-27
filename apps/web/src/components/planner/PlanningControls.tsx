export function PlanningControls({
  planningDate,
  trainCount,
  isOptimizing,
  solverStatus,
  optimizedSchedule,
  error,
  onOptimize,
}: {
  planningDate: string;
  trainCount: number;
  isOptimizing: boolean;
  solverStatus: string | null;
  optimizedSchedule: Array<{
    train_key: string;
    cp_sat_departure_minutes: number;
  }> | null;
  error: string | null;
  onOptimize: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Planning inputs
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Runs CP-SAT train departure sequencing (minimum headway per
            section). Maintenance block optimization is not built yet.
          </p>
        </div>
        <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:block">
          Input → Optimize → Result
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Planning Date
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] normal-case tracking-normal text-slate-700">
            {planningDate}
          </span>
        </div>

        <div className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Train Movements
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] normal-case tracking-normal text-slate-700">
            {trainCount} on this date
          </span>
        </div>

        <button
          type="button"
          onClick={onOptimize}
          disabled={isOptimizing}
          className="ml-auto inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          {isOptimizing ? "Optimizing..." : "Sequence Train Departures"}
        </button>
        {solverStatus ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
            Solver: {solverStatus} ({optimizedSchedule?.length ?? 0} departures)
          </span>
        ) : null}
        {error ? (
          <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
