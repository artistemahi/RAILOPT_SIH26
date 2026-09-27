import { MetricStrip, PageHeader, SectionPanel } from "../components/rail";
import { usePlan } from "../state/PlanContext";
import { Bar } from "../ui";
import { DAY_MINUTES, GenerateButton, PlanRequired, dayLabel } from "./common";

function BarList({ rows, unit = "" }: { rows: Array<{ label: string; value: number; total?: number }>; unit?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.total ?? row.value));
  return (
    <div className="bar-list">
      {rows.map((row) => (
        <div key={row.label} className="bar-list-row">
          <span>{row.label}</span>
          <Bar value={(100 * row.value) / (row.total ?? max)} tone={row.total ? "ok" : "info"} />
          <span className="bar-value">
            {row.value}
            {row.total !== undefined ? ` / ${row.total}` : unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function band(score: number) {
  return score >= 80 ? "P1 (≥ 80)" : score >= 65 ? "P2 (65–79)" : "P3 (< 65)";
}

export default function Analytics() {
  const { plan } = usePlan();

  return (
    <>
      <PageHeader
        section="ANALYTICS"
        title="Plan analytics"
        subtitle="Breakdowns of the latest plan, computed from the solver output"
        action={<GenerateButton />}
      />
      <PlanRequired>
        {plan && (() => {
          const tasks = plan.task_details ?? [];
          const group = (key: (task: (typeof tasks)[number]) => string) => {
            const totals = new Map<string, { value: number; total: number }>();
            for (const task of tasks) {
              const entry = totals.get(key(task)) ?? { value: 0, total: 0 };
              entry.total += 1;
              if (task.scheduled_window) entry.value += 1;
              totals.set(key(task), entry);
            }
            return [...totals.entries()].sort().map(([label, entry]) => ({ label, ...entry }));
          };
          const minutesBySection = new Map<string, number>();
          for (const item of plan.assignments) {
            minutesBySection.set(item.section_id, (minutesBySection.get(item.section_id) ?? 0) + item.end_minute - item.start_minute);
          }
          const perDay = Array.from({ length: plan.horizon_days }, (_, index) => ({
            label: dayLabel(plan.planning_date, index),
            value: plan.assignments.filter((item) => Math.floor(item.start_minute / DAY_MINUTES) === index).length,
          }));

          return (
            <>
              <MetricStrip
                metrics={[
                  { label: "Tasks scheduled", value: `${plan.kpis.tasks_scheduled} / ${plan.kpis.tasks_considered}`, status: "info" },
                  { label: "Had a feasible window", value: plan.kpis.tasks_with_candidates, status: "neutral" },
                  { label: "Priority-weighted", value: `${plan.kpis.priority_weighted_completion_pct}%`, status: "success" },
                  { label: "Block utilisation", value: `${plan.kpis.block_utilization_pct}%`, hint: `${plan.kpis.used_section_minutes} of ${plan.kpis.available_section_minutes} section-min`, status: "neutral" },
                  { label: "Parallel multi-dept pairs", value: plan.coordination.multi_department_pairs, status: "neutral" },
                ]}
              />
              <div className="grid-2-cols">
                <SectionPanel title="Scheduled by priority band" subtitle="scheduled / pending">
                  <BarList rows={group((task) => band(task.priority_score))} />
                </SectionPanel>
                <SectionPanel title="Scheduled by department" subtitle="scheduled / pending">
                  <BarList rows={group((task) => task.department)} />
                </SectionPanel>
                <SectionPanel title="Scheduled by section" subtitle="scheduled / pending">
                  <BarList rows={group((task) => task.section_id)} />
                </SectionPanel>
                <SectionPanel title="Planned work minutes by section">
                  <BarList
                    rows={[...minutesBySection.entries()].sort().map(([label, value]) => ({ label, value }))}
                    unit=" min"
                  />
                </SectionPanel>
                <SectionPanel title="Tasks started per day">
                  <BarList rows={perDay} />
                </SectionPanel>
                <SectionPanel title="Scheduled by task type" subtitle="scheduled / pending">
                  <BarList rows={group((task) => task.task_type ?? "UNKNOWN")} />
                </SectionPanel>
              </div>
            </>
          );
        })()}
      </PlanRequired>
    </>
  );
}
