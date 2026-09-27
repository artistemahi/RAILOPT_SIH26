import { useNavigate } from "react-router-dom";
import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getDashboardData } from "../services/dashboardService";
import { getBacklog } from "../services/workspaceService";
import { usePlan } from "../state/PlanContext";
import { Donut } from "../ui";
import { ErrorNote, GenerateButton, KeyValueGrid, Loading } from "./common";

const toneStatus = {
  default: "neutral",
  danger: "danger",
  warning: "warning",
  success: "success",
} as const;

const corridorTone: Record<string, string> = {
  Normal: "READY",
  Busy: "WARNING",
  Blocked: "CRITICAL",
  Selected: "FEASIBLE",
};

export default function Overview() {
  const navigate = useNavigate();
  const { data: dashboard, error } = useApi(getDashboardData);
  const { data: backlog } = useApi(getBacklog);
  const { plan, version } = usePlan();

  if (error) return <ErrorNote message="Dashboard data is unavailable. Check the API connection." />;
  if (!dashboard) return <Loading what="command center" />;

  const counts = backlog?.statusCounts ?? {};
  const recommended = dashboard.recommendedBlock;

  return (
    <>
      <PageHeader
        section="COMMAND CENTER"
        title="Maintenance Block Planning"
        subtitle={`Synthetic network · planning date ${dashboard.planningDate} · all figures computed from the RAILOPT dataset`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-rail btn-rail-secondary" onClick={() => navigate("/tasks")}>
              Task backlog
            </button>
            <GenerateButton />
          </div>
        }
      />

      <MetricStrip
        metrics={dashboard.assetSummary.map((item) => ({
          label: item.label,
          value: item.value,
          hint: item.supportText,
          status: toneStatus[item.tone],
        }))}
      />

      <div className="grid-68-32">
        <SectionPanel
          title="Highest-priority pending tasks"
          subtitle="Priority: planner override → latest ML score → dataset score"
          action={
            <button type="button" className="btn-rail btn-rail-ghost" onClick={() => navigate("/tasks")}>
              All tasks →
            </button>
          }
          noPadding
        >
          <DataTable
            data={(backlog?.tasks ?? []).filter((task) => task.status === "PENDING").slice(0, 10)}
            keyField="taskId"
            columns={[
              { header: "Task", accessor: (row) => <span className="cell-id">{row.taskId}</span>, width: 110 },
              { header: "Asset", accessor: "assetId", width: 100 },
              { header: "Work", accessor: "task" },
              { header: "Dept", accessor: "department", width: 100 },
              { header: "Section", accessor: "sectionId", width: 80 },
              { header: "Priority", accessor: (row) => <StatusBadge status={row.priority === "P1" ? "CRITICAL" : row.priority === "P2" ? "WARNING" : "LOW"} label={`${row.priority} · ${row.priorityScore}`} />, width: 95 },
              { header: "Overdue", accessor: (row) => (row.overdueDays > 0 ? `${row.overdueDays} d` : "–"), width: 70 },
            ]}
          />
        </SectionPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionPanel
            title={version ? `Plan in view · V${version.version} ${version.status}` : "Plan in view"}
            level={3}
            accent={plan ? (plan.validation.passed ? "success" : "critical") : "info"}
          >
            {plan ? (
              <>
                <KeyValueGrid
                  rows={[
                    ["Solver", <StatusBadge status={plan.solver.status} />],
                    ["Validation", <StatusBadge status={plan.validation.passed ? "PASS" : "FAIL"} />],
                    ["Scheduled", `${plan.kpis.tasks_scheduled} / ${plan.kpis.tasks_considered}`],
                    ["Priority-weighted", `${plan.kpis.priority_weighted_completion_pct}%`],
                  ]}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" className="btn-rail btn-rail-secondary" onClick={() => navigate("/schedule")}>
                    Schedule
                  </button>
                  <button type="button" className="btn-rail btn-rail-ghost" onClick={() => navigate("/versions")}>
                    Versions &amp; approval
                  </button>
                </div>
              </>
            ) : (
              <p className="muted-note">
                No plan version yet. Generate one to see the CP-SAT schedule, validation and KPIs.
              </p>
            )}
          </SectionPanel>

          {recommended && (
            <SectionPanel title="Best candidate window on the planning date" subtitle="Heuristic ranking before optimization">
              <KeyValueGrid
                rows={[
                  ["Window", recommended.blockId],
                  ["Section", recommended.corridor],
                  ["Time", recommended.timeWindow],
                  ["Duration", recommended.durationHours],
                  ["Fitting tasks", recommended.compatibleTasks],
                  ["Train impact", recommended.trainImpact],
                ]}
              />
            </SectionPanel>
          )}
        </div>
      </div>

      <div className="grid-3-cols">
        <SectionPanel title={`Task status (${Object.values(counts).reduce((sum, count) => sum + count, 0)} tasks)`}>
          <KeyValueGrid rows={Object.entries(counts).map(([status, count]) => [status, count])} />
        </SectionPanel>

        <SectionPanel title="Train impact of windows" subtitle="Share of block windows by overlapping trains">
          <Donut
            segments={dashboard.trainImpact.map((item) => ({ value: item.value, color: item.color }))}
            center={`${dashboard.trainImpact.find((item) => item.name === "Low Impact")?.value ?? 0}%`}
            label="low impact"
          />
          <div className="chip-row" style={{ justifyContent: "center", marginTop: 8 }}>
            {dashboard.trainImpact.map((item) => (
              <span key={item.name} style={{ fontSize: 11 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, background: item.color, marginRight: 4 }} />
                {item.name} {item.value}%
              </span>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Stations on the planning date">
          <div className="chip-row">
            {dashboard.corridorStatus.map((station) => (
              <StatusBadge key={station.name} status={corridorTone[station.state]} label={`${station.name} · ${station.state}`} />
            ))}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel title="Alerts" subtitle="Open critical defects and overdue work from the dataset" noPadding>
        <DataTable
          data={dashboard.alerts.map((alert, index) => ({ ...alert, id: index }))}
          keyField="id"
          columns={[
            { header: "Severity", accessor: (row) => <StatusBadge status={row.severity} />, width: 110 },
            { header: "Alert", accessor: "title" },
            { header: "When", accessor: "timestamp", width: 190 },
          ]}
        />
      </SectionPanel>
    </>
  );
}
