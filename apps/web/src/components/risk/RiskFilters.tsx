export type RiskFilterState = {
  department: string;
  priority: string;
  section: string;
};

export const emptyRiskFilters: RiskFilterState = {
  department: "",
  priority: "",
  section: "",
};

const selectClass =
  "rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export function RiskFilters({
  departments,
  sections,
  value,
  onChange,
}: {
  departments: string[];
  sections: string[];
  value: RiskFilterState;
  onChange: (value: RiskFilterState) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border border-slate-200 bg-white p-3 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Department</span>
        <select
          className={selectClass}
          value={value.department}
          onChange={(event) => onChange({ ...value, department: event.target.value })}
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department}>{department}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Priority</span>
        <select
          className={selectClass}
          value={value.priority}
          onChange={(event) => onChange({ ...value, priority: event.target.value })}
        >
          <option value="">All Priorities</option>
          <option>P1</option>
          <option>P2</option>
          <option>P3</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
        <span>Section</span>
        <select
          className={selectClass}
          value={value.section}
          onChange={(event) => onChange({ ...value, section: event.target.value })}
        >
          <option value="">All Sections</option>
          {sections.map((section) => (
            <option key={section}>{section}</option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => onChange(emptyRiskFilters)}
        className="self-end rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        Clear Filters
      </button>
    </div>
  );
}
