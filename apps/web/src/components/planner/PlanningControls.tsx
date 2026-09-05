export function PlanningControls() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="flex min-w-[180px] flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
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

      <label className="flex min-w-[180px] flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        Planning Date
        <input
          aria-label="Planning date"
          type="text"
          defaultValue="20/05/2025"
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="flex min-w-[180px] flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
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

      <label className="flex min-w-[180px] flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
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

      <label className="flex min-w-[180px] flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
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
        className="ml-auto inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        Optimize Schedule
      </button>
    </div>
  );
}
