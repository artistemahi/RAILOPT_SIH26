import { useMemo, useState } from "react";
import type { BlockPlan, BlockPlanAssignment } from "../../types/planner";

const departmentColors: Record<string, string> = {
  ENGINEERING: "border-blue-300 bg-blue-100 text-blue-900",
  TRD: "border-violet-300 bg-violet-100 text-violet-900",
  "S&T": "border-teal-300 bg-teal-100 text-teal-900",
};

const reasonLabels: Record<string, string> = {
  WINDOW_TOO_SHORT: "Window too short",
  TRAIN_CONFLICT: "Train conflict",
  RESOURCE_UNAVAILABLE: "Resource unavailable",
  WINDOW_UNAVAILABLE: "Window unavailable",
  BLOCK_TYPE_MISMATCH: "Block type mismatch",
  SECTION_NOT_COVERED: "Section not covered",
  NO_WINDOW_IN_HORIZON: "No window in horizon",
  NO_REQUIREMENT: "No block requirement",
  DEPENDENCY_BLOCKED: "Dependency blocked",
  NOT_SELECTED: "Not selected",
};

const DAY_MINUTES = 24 * 60;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-[17px] font-semibold text-slate-900">{value}</div>
      {sub ? <div className="text-[10px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

function PlanGantt({
  assignments,
  day,
}: {
  assignments: BlockPlanAssignment[];
  day: number;
}) {
  const dayStart = day * DAY_MINUTES;
  const dayEnd = dayStart + DAY_MINUTES;
  const visible = assignments.filter(
    (item) => item.start_minute < dayEnd && item.end_minute > dayStart,
  );
  const sections = [...new Set(visible.map((item) => item.section_id))].sort();

  if (!visible.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No tasks planned on this day.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[110px_1fr] border-b border-slate-200 text-[10px] text-slate-500">
          <div className="px-2 py-1.5">Section</div>
          <div className="grid grid-cols-6 border-l border-slate-200">
            {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((label) => (
              <div key={label} className="px-1 py-1.5">
                {label}
              </div>
            ))}
          </div>
        </div>
        {sections.map((section) => (
          <div
            key={section}
            className="grid grid-cols-[110px_1fr] border-b border-slate-100 last:border-b-0"
          >
            <div className="bg-slate-50 px-2 py-2 text-[11px] font-medium text-slate-700">
              {section}
            </div>
            <div className="relative h-11">
              <div className="absolute inset-0 grid grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="border-l border-slate-100" />
                ))}
              </div>
              {visible
                .filter((item) => item.section_id === section)
                .map((item) => {
                  const start = Math.max(item.start_minute, dayStart) - dayStart;
                  const end = Math.min(item.end_minute, dayEnd) - dayStart;
                  return (
                    <div
                      key={item.task_id}
                      title={`${item.task_id} · ${item.department} · ${item.start.slice(11)}–${item.end.slice(11)} · ${item.window_id} · priority ${item.priority_score}`}
                      className={`absolute top-1.5 flex h-8 items-center overflow-hidden rounded border px-1 text-[9px] font-semibold ${departmentColors[item.department] ?? "border-slate-300 bg-slate-100 text-slate-800"}`}
                      style={{
                        left: `${(start / DAY_MINUTES) * 100}%`,
                        width: `${Math.max(((end - start) / DAY_MINUTES) * 100, 0.6)}%`,
                      }}
                    >
                      <span className="truncate">{item.task_id.replace("TASK_", "")}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlockPlanPanel({
  plan,
  isPlanning,
  error,
  onGenerate,
}: {
  plan: BlockPlan | null;
  isPlanning: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const [day, setDay] = useState(0);
  const planDays = useMemo(() => {
    if (!plan) return [];
    const base = new Date(`${plan.planning_date}T00:00:00`);
    return Array.from({ length: plan.horizon_days }, (_, index) => {
      const date = new Date(base.getTime() + index * 86_400_000);
      const count = plan.assignments.filter(
        (item) => Math.floor(item.start_minute / DAY_MINUTES) === index,
      ).length;
      return {
        index,
        label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        count,
      };
    });
  }, [plan]);

  const solved = plan && ["OPTIMAL", "FEASIBLE"].includes(plan.solver.status);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            CP-SAT block plan
          </p>
          <p className="mt-1 max-w-3xl text-xs text-slate-600">
            Assigns pending tasks to available block windows over the planning
            horizon. Hard constraints: window fit (incl. setup/release), no work
            during train movements on the section, one task per section at a
            time, resource capacity and mandatory dependencies. Objective:
            maximise priority-weighted tasks, higher priority earlier. The result
            is a recommendation for planner review, not an authorised block.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isPlanning}
          className="rounded-md bg-blue-700 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          {isPlanning ? "Solving..." : plan ? "Re-run Block Plan" : "Generate Block Plan"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </div>
      ) : null}

      {plan ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="Solver"
              value={plan.solver.status}
              sub={`${plan.solver.wall_time_seconds}s · ${plan.solver.variables} vars · ${plan.solver.constraints} constraints`}
            />
            <Stat
              label="Independent validation"
              value={plan.validation.passed ? "PASS" : "FAIL"}
              sub={`${plan.validation.checks.length} checks · ${plan.validation.violations.length} violations`}
            />
            <Stat
              label="Tasks scheduled"
              value={`${plan.kpis.tasks_scheduled} / ${plan.kpis.tasks_considered}`}
              sub={`${plan.kpis.tasks_with_candidates} had a feasible window`}
            />
            <Stat
              label="P1 scheduled"
              value={`${plan.kpis.p1_scheduled} / ${plan.kpis.p1_total}`}
              sub="priority score ≥ 80"
            />
            <Stat
              label="Priority-weighted"
              value={`${plan.kpis.priority_weighted_completion_pct}%`}
              sub="of total pending priority"
            />
            <Stat
              label="Block utilisation"
              value={`${plan.kpis.block_utilization_pct}%`}
              sub={`${plan.kpis.used_section_minutes} of ${plan.kpis.available_section_minutes} section-min`}
            />
          </div>

          {!plan.validation.passed ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
              {plan.validation.violations.slice(0, 5).map((violation) => (
                <div key={`${violation.check}-${violation.task_id}`}>
                  {violation.check} · {violation.task_id}: {violation.message}
                </div>
              ))}
            </div>
          ) : null}

          {solved ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {planDays.map((item) => (
                  <button
                    key={item.index}
                    type="button"
                    onClick={() => setDay(item.index)}
                    className={[
                      "rounded-md border px-2 py-1 text-[11px]",
                      day === item.index
                        ? "border-blue-300 bg-blue-50 font-semibold text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {item.label} · {item.count}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
                  {Object.entries(departmentColors).map(([department, style]) => (
                    <span key={department} className="flex items-center gap-1">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm border ${style}`} />
                      {department}
                    </span>
                  ))}
                </span>
              </div>
              <PlanGantt assignments={plan.assignments} day={day} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-800">
                Scheduled tasks ({plan.assignments.length})
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-2 py-2 font-medium">Task</th>
                      <th className="px-2 py-2 font-medium">Dept</th>
                      <th className="px-2 py-2 font-medium">Section</th>
                      <th className="px-2 py-2 font-medium">Window</th>
                      <th className="px-2 py-2 font-medium">Start – End</th>
                      <th className="px-2 py-2 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.assignments.map((item) => (
                      <tr key={item.task_id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-2 py-1.5 font-medium text-slate-800">{item.task_id}</td>
                        <td className="px-2 py-1.5">{item.department}</td>
                        <td className="px-2 py-1.5">{item.section_id}</td>
                        <td className="px-2 py-1.5">{item.window_id}</td>
                        <td className="px-2 py-1.5">
                          {item.start.slice(5)} – {item.end.slice(11)}
                        </td>
                        <td className="px-2 py-1.5">{item.priority_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                Not scheduled ({plan.unscheduled.length})
                {Object.entries(
                  plan.unscheduled.reduce<Record<string, number>>((counts, item) => {
                    counts[item.reason_code] = (counts[item.reason_code] ?? 0) + 1;
                    return counts;
                  }, {}),
                ).map(([code, count]) => (
                  <span
                    key={code}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                  >
                    {reasonLabels[code] ?? code}: {count}
                  </span>
                ))}
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-2 py-2 font-medium">Task</th>
                      <th className="px-2 py-2 font-medium">Priority</th>
                      <th className="px-2 py-2 font-medium">Why not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.unscheduled.map((item) => (
                      <tr key={item.task_id} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-2 py-1.5 font-medium text-slate-800">{item.task_id}</td>
                        <td className="px-2 py-1.5">{item.priority_score}</td>
                        <td className="px-2 py-1.5">
                          <div>{item.reason}</div>
                          {item.example ? (
                            <div className="text-[10px] text-slate-500">e.g. {item.example}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
