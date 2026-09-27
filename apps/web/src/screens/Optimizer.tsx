import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { usePlan } from "../state/PlanContext";
import { Bar } from "../ui";
import { GenerateButton, KeyValueGrid, PlanRequired, reasonLabels } from "./common";

export default function Optimizer() {
  const { plan } = usePlan();

  return (
    <>
      <PageHeader
        section="OPTIMIZATION"
        title="CP-SAT solver run"
        subtitle="Google OR-Tools CP-SAT (constraint programming, not ML). Hard constraints must hold; the objective ranks feasible plans."
        action={<GenerateButton />}
      />
      <PlanRequired>
        {plan && (
          <>
            <MetricStrip
              metrics={[
                { label: "Status", value: plan.solver.status, status: plan.solver.status === "OPTIMAL" ? "success" : "warning" },
                { label: "Wall time", value: `${plan.solver.wall_time_seconds}s`, status: "neutral" },
                { label: "Variables", value: plan.solver.variables, status: "neutral" },
                { label: "Constraints", value: plan.solver.constraints, status: "neutral" },
                { label: "Candidate pairs", value: plan.kpis.candidate_pairs, hint: `${plan.kpis.rejected_pairs} task-window pairs rejected`, status: "info" },
              ]}
            />

            <div className="grid-2-cols">
              <SectionPanel title="Model">
                <p style={{ marginBottom: 6 }}><strong>Decision:</strong> for each task, at most one candidate window and a start time inside a train-free gap of that window.</p>
                <p style={{ marginBottom: 6 }}><strong>Hard constraints:</strong></p>
                <ul style={{ paddingLeft: 16, marginBottom: 6 }}>
                  <li>Window fit incl. setup and release; block type and max duration</li>
                  <li>No work while a train occupies the section</li>
                  <li>Resource capacity (cumulative), status, department and skill</li>
                  <li>Mandatory finish-to-start dependencies with minimum gap</li>
                  <li>One job per asset at a time; repair/replacement before testing</li>
                </ul>
                <p><strong>Objective (lexicographic):</strong> maximise priority-weighted scheduled tasks, then start higher-priority work earlier.</p>
              </SectionPanel>

              <SectionPanel title="Priority input">
                <KeyValueGrid
                  rows={[
                    ["Source", plan.priority.source],
                    ["Model", plan.priority.model_version ?? "–"],
                    ["Run", plan.priority.run_id ? plan.priority.run_id.slice(0, 8) : "–"],
                    ["Overrides", "Planner overrides take precedence"],
                  ]}
                />
                {plan.priority.note && <p style={{ marginTop: 8, color: "var(--state-warning)" }}>{plan.priority.note}</p>}
                <p className="muted-note" style={{ marginTop: 8 }}>
                  P1 = score ≥ 80: {plan.kpis.p1_scheduled} of {plan.kpis.p1_total} scheduled.
                </p>
              </SectionPanel>
            </div>

            {plan.comparison && (
              <SectionPanel title="Effect of the compatibility engine" subtitle="Same inputs solved twice; both plans independently validated">
                <DataTable
                  data={(
                    [
                      ["Tasks scheduled", "tasks_scheduled", ""],
                      ["P1 scheduled", "p1_scheduled", ""],
                      ["Priority-weighted completion", "priority_weighted_completion_pct", "%"],
                      ["Block utilisation", "block_utilization_pct", "%"],
                    ] as const
                  ).map(([label, key, unit]) => ({
                    label,
                    exclusive: `${plan.comparison!.section_exclusive[key]}${unit}`,
                    coordinated: `${plan.comparison!.coordinated[key]}${unit}`,
                  }))}
                  keyField="label"
                  columns={[
                    { header: "Metric", accessor: "label" },
                    { header: "One task per section", accessor: "exclusive" },
                    { header: "Compatibility-aware", accessor: (row) => <strong>{row.coordinated}</strong> },
                  ]}
                />
              </SectionPanel>
            )}

            <div className="grid-2-cols">
              <SectionPanel title="Why task-window pairs were rejected" subtitle="Before the solver: candidate window engine">
                <div className="bar-list">
                  {Object.entries(plan.rejection_summary).map(([code, count]) => (
                    <div key={code} className="bar-list-row">
                      <span>{reasonLabels[code] ?? code}</span>
                      <Bar value={(100 * count) / Math.max(...Object.values(plan.rejection_summary))} tone="warn" />
                      <span className="bar-value">{count}</span>
                    </div>
                  ))}
                </div>
              </SectionPanel>

              <SectionPanel title={`Not scheduled (${plan.unscheduled.length})`} subtitle="Highest priority first" noPadding>
                <DataTable
                  data={plan.unscheduled}
                  keyField="task_id"
                  maxHeight={320}
                  columns={[
                    { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
                    { header: "Score", accessor: "priority_score", width: 60 },
                    { header: "Reason", accessor: (row) => <StatusBadge status="HOLD" dot={false} label={reasonLabels[row.reason_code] ?? row.reason_code} />, width: 150 },
                    { header: "Detail", accessor: (row) => <span className="muted-note">{row.reason}</span> },
                  ]}
                />
              </SectionPanel>
            </div>
          </>
        )}
      </PlanRequired>
    </>
  );
}
