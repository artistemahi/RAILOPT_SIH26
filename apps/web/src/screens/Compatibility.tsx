import { useMemo, useState } from "react";
import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { usePlan } from "../state/PlanContext";
import { PlanRequired, edgeHelp, edgeLabels } from "./common";

const kindStatus: Record<string, string> = {
  SHARED_RESOURCE: "WARNING",
  SAME_ASSET: "CRITICAL",
  DEPENDENCY: "INFO",
  TASK_TYPE_ORDER: "INFO",
  COORDINATION: "PASS",
};

export default function Compatibility() {
  const { plan } = usePlan();
  const [kind, setKind] = useState("ALL");
  const [query, setQuery] = useState("");

  const edges = useMemo(
    () => (plan?.compatibility_edges ?? []).map((edge, index) => ({ ...edge, id: index })),
    [plan],
  );

  return (
    <>
      <PageHeader
        section="COORDINATION"
        title="Task compatibility and conflicts"
        subtitle="NetworkX graph over tasks with a candidate window: conflict edges become CP-SAT constraints, coordination edges allow parallel work"
      />
      <PlanRequired>
        {plan && (
          <>
            <MetricStrip
              metrics={[
                ...Object.entries(plan.compatibility.edges_by_type).map(([edgeKind, count]) => ({
                  label: edgeLabels[edgeKind] ?? edgeKind,
                  value: count,
                  hint: edgeHelp[edgeKind]?.split(":")[0],
                  status: (edgeKind === "COORDINATION" ? "success" : "neutral") as "success" | "neutral",
                })),
                {
                  label: "Parallel multi-dept pairs",
                  value: plan.coordination.multi_department_pairs,
                  hint: `in ${plan.coordination.windows_with_multi_department_work} window(s) of the plan`,
                  status: "info" as const,
                },
              ]}
            />

            <div className="grid-65-35">
              <SectionPanel
                title="Edges"
                subtitle={`${edges.length} task pairs`}
                action={
                  <div className="chip-row">
                    <select className="rail-select" value={kind} onChange={(event) => setKind(event.target.value)}>
                      <option value="ALL">All kinds</option>
                      {Object.keys(plan.compatibility.edges_by_type).map((value) => (
                        <option key={value} value={value}>{edgeLabels[value] ?? value}</option>
                      ))}
                    </select>
                    <input className="rail-input" placeholder="Task id…" value={query} onChange={(event) => setQuery(event.target.value)} />
                  </div>
                }
                noPadding
              >
                <DataTable
                  data={edges.filter(
                    (edge) =>
                      (kind === "ALL" || edge.kind === kind) &&
                      (!query || `${edge.a} ${edge.b}`.toLowerCase().includes(query.toLowerCase())),
                  ).slice(0, 400)}
                  keyField="id"
                  maxHeight={560}
                  columns={[
                    { header: "Task A", accessor: (row) => <span className="cell-id">{row.a}</span>, width: 110 },
                    { header: "Task B", accessor: (row) => <span className="cell-id">{row.b}</span>, width: 110 },
                    { header: "Relation", accessor: (row) => <StatusBadge status={kindStatus[row.kind] ?? "INFO"} label={edgeLabels[row.kind] ?? row.kind} />, width: 150 },
                    { header: "Rule", accessor: "rule", width: 90 },
                    { header: "Detail", accessor: "detail" },
                  ]}
                  emptyMessage="No edges match."
                />
              </SectionPanel>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <SectionPanel title="What each relation means">
                  <ul style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                    {Object.entries(edgeHelp).map(([edgeKind, help]) => (
                      <li key={edgeKind}>
                        <strong>{edgeLabels[edgeKind]}</strong> — <span className="muted-note">{help}</span>
                      </li>
                    ))}
                  </ul>
                </SectionPanel>

                <SectionPanel title="Multi-department work in the plan" subtitle="Different departments on one section at the same time" noPadding>
                  <DataTable
                    data={plan.coordination.sample.map((pair, index) => ({ ...pair, id: index }))}
                    keyField="id"
                    maxHeight={240}
                    columns={[
                      { header: "Section", accessor: "section_id", width: 80 },
                      { header: "Tasks", accessor: (row) => row.tasks.join(" + ") },
                      { header: "Depts", accessor: (row) => row.departments.join(" + ") },
                      { header: "Window", accessor: "window_id", width: 90 },
                    ]}
                    emptyMessage="No parallel multi-department work in this plan."
                  />
                </SectionPanel>

                <SectionPanel title="Graph checks">
                  <ul style={{ paddingLeft: 16 }}>
                    <li>Dependency cycles (RULE_020): {plan.compatibility.dependency_cycles.length}</li>
                    <li>Successor due before predecessor (RULE_019): {plan.compatibility.deadline_conflicts.length}</li>
                    <li>Assets with more than one pending job: {plan.compatibility.same_asset_groups}</li>
                    <li>Repair/replacement → testing orders: {plan.compatibility.task_type_orders}</li>
                  </ul>
                </SectionPanel>
              </div>
            </div>
          </>
        )}
      </PlanRequired>
    </>
  );
}
