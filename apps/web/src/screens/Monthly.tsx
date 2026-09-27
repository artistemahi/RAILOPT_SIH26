import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import {
  createMonthlyVersion,
  getMonthlyVersion,
  listPlanVersions,
} from "../services/planVersionsService";
import { usePlan } from "../state/PlanContext";
import type { MonthlyVersion } from "../types/versions";
import { KeyValueGrid, reasonLabels } from "./common";
import { DecisionActions, statusTone } from "./versionParts";

const extraReasons: Record<string, string> = {
  CAPACITY: "No capacity left this month",
  DEPENDENCY_BLOCKED: "Predecessor not planned",
};

function weekLabel(start: string, end: string): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return `${format(start)} – ${format(end)}`;
}

/** Background shade for a section-week cell by share of capacity used. */
function heat(used: number, capacity: number): string {
  if (!capacity) return "var(--bg-subtle)";
  const share = used / capacity;
  if (share === 0) return "var(--bg-surface)";
  if (share < 0.25) return "#E3EEF9";
  if (share < 0.5) return "#BFD7F0";
  if (share < 0.75) return "#8DB6E2";
  return "#4F86C6";
}

export default function Monthly() {
  const navigate = useNavigate();
  const { plannerName, plan: weeklyPlan, version: weeklyVersion } = usePlan();
  const [monthly, setMonthly] = useState<MonthlyVersion | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [weeks, setWeeks] = useState(5);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<number | "ALL">("ALL");

  const loadLatest = useCallback(async () => {
    try {
      const versions = await listPlanVersions();
      const monthlyVersions = versions.filter((item) => item.planType === "MONTHLY");
      const pick = monthlyVersions.find((item) => item.status === "APPROVED") ?? monthlyVersions[0];
      if (pick) setMonthly(await getMonthlyVersion(pick.runId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Monthly plan is unavailable");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  async function generate() {
    setRunning(true);
    setError(null);
    try {
      setMonthly(await createMonthlyVersion(plannerName || "planner", weeks));
      setWeek("ALL");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Monthly planning failed");
    } finally {
      setRunning(false);
    }
  }

  const plan = monthly?.plan;
  const sections = useMemo(
    () => (plan ? Object.keys(plan.week_summary[0]?.sections ?? {}).sort() : []),
    [plan],
  );

  // Link to the weekly plan in view: week 1 of the month vs the exact schedule.
  const weekOne = useMemo(() => {
    if (!plan || !weeklyPlan || weeklyPlan.planning_date !== plan.planning_date) return null;
    const monthWeekOne = new Set(plan.assignments.filter((row) => row.week === 0).map((row) => row.task_id));
    const exact = new Set(weeklyPlan.assignments.map((row) => row.task_id));
    const both = [...monthWeekOne].filter((taskId) => exact.has(taskId)).length;
    return { month: monthWeekOne.size, exact: exact.size, both };
  }, [plan, weeklyPlan]);

  return (
    <>
      <PageHeader
        section="MONTHLY PLAN"
        title="Monthly rough-cut block plan"
        subtitle="Long-term view: which week each pending task goes into. The weekly plan then schedules the current week to the minute."
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="rail-select" value={weeks} onChange={(event) => setWeeks(Number(event.target.value))}>
              {[4, 5, 6].map((value) => (
                <option key={value} value={value}>{value} weeks</option>
              ))}
            </select>
            <button type="button" className="btn-rail btn-rail-primary" disabled={running} onClick={() => void generate()}>
              {running ? "Solving…" : monthly ? "Re-run monthly plan" : "Generate monthly plan"}
            </button>
          </div>
        }
      />
      {error && <p style={{ color: "var(--state-critical)" }}>{error}</p>}

      {!loaded && <p className="muted-note">Loading…</p>}
      {loaded && !plan && (
        <SectionPanel title="No monthly plan yet" accent="info">
          <p className="muted-note">
            Generate one: ML scores every task, then CP-SAT assigns pending work to weeks within each week&apos;s
            block capacity, respecting due dates and dependencies.
          </p>
        </SectionPanel>
      )}

      {monthly && plan && (
        <>
          <SectionPanel title="How to read this plan" accent="warning">
            <ul style={{ paddingLeft: 16 }} className="muted-note">
              {plan.assumptions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </SectionPanel>

          <MetricStrip
            metrics={[
              { label: "Version", value: `V${monthly.version}`, hint: monthly.status, status: monthly.status === "APPROVED" ? "success" : "warning" },
              { label: "Tasks planned", value: `${plan.kpis.tasks_scheduled} / ${plan.kpis.tasks_considered}`, hint: `${plan.weeks} weeks`, status: "info" },
              { label: "Priority-weighted", value: `${plan.kpis.priority_weighted_completion_pct}%`, status: "success" },
              { label: "Overdue cleared", value: `${plan.kpis.overdue_planned} / ${plan.kpis.overdue_at_start}`, hint: "overdue on the planning date", status: "warning" },
              { label: "Planned after due week", value: plan.kpis.planned_late, status: plan.kpis.planned_late ? "danger" : "success" },
              { label: "Check", value: plan.validation.passed ? "PASS" : "FAIL", hint: `${plan.solver.status} · ${plan.solver.wall_time_seconds}s`, status: plan.validation.passed ? "success" : "danger" },
            ]}
          />

          <SectionPanel title="Weeks" subtitle="Click a week to filter the task list">
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${plan.week_summary.length}, minmax(0, 1fr))`, gap: 8 }}>
              {plan.week_summary.map((row) => (
                <button
                  key={row.week}
                  type="button"
                  onClick={() => setWeek(week === row.week ? "ALL" : row.week)}
                  className={`rail-panel ${week === row.week ? "accent-navy" : ""}`}
                  style={{ textAlign: "left", padding: 10 }}
                >
                  <div className="kv-label">
                    Week {row.week + 1} {row.projected ? "· projected" : "· dataset"}
                  </div>
                  <div style={{ fontWeight: 600 }}>{weekLabel(row.start, row.end)}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--navy-primary)" }}>{row.tasks} tasks</div>
                  <div className="muted-note">
                    {Object.entries(row.by_department).map(([department, count]) => `${department} ${count}`).join(" · ") || "–"}
                  </div>
                  <div className="muted-note">{row.minutes_used} of {row.capacity_minutes} train-free min</div>
                </button>
              ))}
            </div>
          </SectionPanel>

          <div className="grid-55-45">
            <SectionPanel title="Section load by week" subtitle="Planned work minutes / train-free window minutes" noPadding>
              <div className="rail-table-container">
                <table className="rail-data-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      {plan.week_summary.map((row) => (
                        <th key={row.week}>W{row.week + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <tr key={section}>
                        <td className="cell-mono">{section}</td>
                        {plan.week_summary.map((row) => {
                          const cell = row.sections[section] ?? { used: 0, capacity: 0 };
                          return (
                            <td key={row.week} style={{ background: heat(cell.used, cell.capacity) }} title={`${cell.used} / ${cell.capacity} min`}>
                              <span className="cell-mono" style={{ fontSize: 11 }}>
                                {cell.used}/{cell.capacity}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionPanel>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionPanel title="Link to the weekly plan" level={3} accent="navy">
                {weekOne ? (
                  <>
                    <KeyValueGrid
                      rows={[
                        ["Monthly · week 1", `${weekOne.month} tasks`],
                        [`Weekly V${weeklyVersion?.version} (exact)`, `${weekOne.exact} tasks`],
                        ["In both", weekOne.both],
                      ]}
                    />
                    <p className="muted-note" style={{ marginTop: 8 }}>
                      The weekly plan checks train-free gaps minute by minute, resources, same-asset order and
                      dependency gaps, so it can place fewer (or different) tasks than the rough cut.
                    </p>
                  </>
                ) : (
                  <p className="muted-note">Generate a weekly plan for the same planning date to compare week 1.</p>
                )}
                <button type="button" className="btn-rail btn-rail-ghost" style={{ marginTop: 8 }} onClick={() => navigate("/schedule")}>
                  Open weekly schedule
                </button>
              </SectionPanel>

              <SectionPanel title="Planner decision" subtitle={`Monthly V${monthly.version}`} action={<StatusBadge status={statusTone[monthly.status] ?? monthly.status} label={monthly.status} />}>
                <DecisionActions version={monthly} onDecided={(summary) => setMonthly({ ...monthly, ...summary })} />
              </SectionPanel>
            </div>
          </div>

          <SectionPanel
            title={week === "ALL" ? `Planned tasks (${plan.assignments.length})` : `Week ${week + 1} tasks`}
            action={week !== "ALL" && <button type="button" className="btn-rail btn-rail-ghost" onClick={() => setWeek("ALL")}>Show all weeks</button>}
            noPadding
          >
            <DataTable
              data={plan.assignments.filter((row) => week === "ALL" || row.week === week)}
              keyField="task_id"
              maxHeight={420}
              columns={[
                { header: "Week", accessor: (row) => `W${row.week + 1}`, width: 60 },
                { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
                { header: "Dept", accessor: "department", width: 110 },
                { header: "Section", accessor: "section_id", width: 80 },
                { header: "Window (pattern)", accessor: "window_id", width: 120 },
                { header: "Priority", accessor: "priority_score", width: 70 },
                { header: "Due", accessor: (row) => row.due_date ?? "–", width: 100 },
                {
                  header: "Timing",
                  accessor: (row) =>
                    row.weeks_late > 0 ? (
                      <StatusBadge status="CRITICAL" label={`${row.weeks_late} wk after due`} />
                    ) : (
                      <StatusBadge status="PASS" label="By due week" />
                    ),
                  width: 140,
                },
              ]}
            />
          </SectionPanel>

          <div className="grid-2-cols">
            <SectionPanel
              title="Block requests"
              subtitle="Work no window of the weekly pattern can hold — longer train-free blocks needed"
              accent="warning"
              noPadding
            >
              <DataTable
                data={plan.block_requests}
                keyField="section_id"
                emptyMessage="Every task fits some window of the pattern."
                columns={[
                  { header: "Section", accessor: (row) => <span className="cell-mono">{row.section_id}</span>, width: 80 },
                  { header: "Tasks", accessor: "task_count", width: 60 },
                  { header: "Depts", accessor: (row) => row.departments.join(", ") },
                  { header: "Needs up to", accessor: (row) => `${row.needed_minutes} min`, width: 100 },
                  { header: "Longest free gap", accessor: (row) => `${row.longest_train_free_gap_minutes} min`, width: 120 },
                ]}
              />
            </SectionPanel>

            <SectionPanel title={`Not planned this month (${plan.unplanned.length})`} noPadding>
              <DataTable
                data={plan.unplanned}
                keyField="task_id"
                maxHeight={360}
                columns={[
                  { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
                  { header: "Score", accessor: "priority_score", width: 55 },
                  { header: "Why", accessor: (row) => extraReasons[row.reason_code] ?? reasonLabels[row.reason_code] ?? row.reason_code, width: 170 },
                  { header: "Detail", accessor: (row) => <span className="muted-note">{row.reason}</span> },
                ]}
              />
            </SectionPanel>
          </div>
        </>
      )}
    </>
  );
}
