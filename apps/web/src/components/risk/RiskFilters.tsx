export function RiskFilters() {
  return (
    <div className="grid grid-cols-1 gap-3 border border-slate-200 bg-white p-3 md:grid-cols-4 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Department</span>
        <select className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option>All Departments</option>
          <option>S&T</option>
          <option>Engineering</option>
          <option>TRD</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Priority</span>
        <select className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option>All Priorities</option>
          <option>P1</option>
          <option>P2</option>
          <option>P3</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Risk Level</span>
        <select className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option>All Risk Levels</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Section</span>
        <select className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option>All Sections</option>
          <option>SEC01</option>
          <option>SEC02</option>
          <option>SEC03</option>
        </select>
      </label>

      <button
        type="button"
        className="self-end rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        Clear Filters
      </button>
    </div>
  );
}
