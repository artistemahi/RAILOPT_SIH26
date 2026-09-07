export function PlanningControls({
  isOptimizing,
  solverStatus,
  optimizedSchedule,
  error,
  onOptimize,
}: {
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
            Use the loaded train schedule to run departure sequencing.
          </p>
        </div>
        <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:block">
          Input → Optimize → Result
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Corridor
          <select
            aria-label="Select corridor"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            defaultValue="C1"
          >
            <option value="C1">C1 (NDLS – KANPUR)</option>
            <option value="C2">C2 (KANPUR – LKO)</option>
          </select>
        </label>

        <label className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Planning Date
          <input
            aria-label="Planning date"
            type="text"
            defaultValue="20/05/2025"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Time Window
          <select
            aria-label="Time window"
            defaultValue="00:00 - 24:00"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          >
            <option value="00:00 - 24:00">00:00 – 24:00</option>
            <option value="06:00 - 18:00">06:00 – 18:00</option>
          </select>
        </label>

        <label className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Planning Horizon
          <select
            aria-label="Planning horizon"
            defaultValue="24 Hours"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          >
            <option value="24 Hours">24 Hours</option>
            <option value="48 Hours">48 Hours</option>
            <option value="72 Hours">72 Hours</option>
          </select>
        </label>

        <label className="flex min-w-45 flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          View Mode
          <select
            aria-label="View mode"
            defaultValue="Gantt View"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          >
            <option value="Gantt View">Gantt View</option>
            <option value="List View">List View</option>
          </select>
        </label>

        <button
          type="button"
          onClick={onOptimize}
          disabled={isOptimizing}
          className="ml-auto inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          {isOptimizing ? "Optimizing..." : "Optimize Schedule"}
        </button>
        {solverStatus ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
            Solver: {solverStatus} ({optimizedSchedule?.length ?? 0} departures)
          </span>
        ) : null}
        {optimizedSchedule?.length ? (
          <span className="text-[11px] text-slate-500 sm:max-w-184 sm:truncate">
            {optimizedSchedule
              .map(
                (item) =>
                  `${item.train_key}: ${item.cp_sat_departure_minutes} min`,
              )
              .join(" | ")}
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
