import { useNavigate } from "react-router-dom";
import { MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getBacklog, getBlockWindows, getSettings } from "../services/workspaceService";
import { usePlan } from "../state/PlanContext";
import { GenerateButton, KeyValueGrid } from "./common";

const steps = [
  ["ML priority", "XGBoost model scores every task; planner overrides are kept"],
  ["Candidate windows", "Block type, duration incl. setup/release, train-free gap, resources, skills"],
  ["Compatibility graph", "Shared resource, same asset, dependency, repair → test order, coordination"],
  ["CP-SAT", "Maximise priority-weighted tasks; higher priority earlier"],
  ["Independent validation", "Every hard rule re-checked outside the solver"],
  ["Planner review", "Recommendation only — a human approves"],
] as const;

export default function PlanningRun() {
  const navigate = useNavigate();
  const { plan, planning, error, generatedAt } = usePlan();
  const { data: backlog } = useApi(getBacklog);
  const { data: windows } = useApi(getBlockWindows);
  const { data: settings } = useApi(getSettings);

  const pending = backlog?.tasks.filter((task) => task.status === "PENDING") ?? [];
  const committed = backlog ? backlog.tasks.length - pending.length : 0;
  const available = windows?.windows.filter((window) => window.available).length ?? 0;
  const stage = planning ? 3 : plan ? steps.length : 0;

  return (
    <>
      <PageHeader
        section="PLANNING RUN"
        title="Generate a block plan"
        subtitle="One run: ML priority → candidate windows → compatibility → CP-SAT → independent validation"
        action={<GenerateButton />}
      />

      <div className="rail-stepper-banner">
        {steps.map(([label], index) => (
          <span key={label} style={{ display: "contents" }}>
            <span className={`step-node ${index < stage ? "completed" : index === stage ? "active" : ""}`}>
              <span className="step-number">{index + 1}</span>
              <span className="step-label">{label}</span>
            </span>
            {index < steps.length - 1 && <span className="step-separator">›</span>}
          </span>
        ))}
      </div>

      <MetricStrip
        metrics={[
          { label: "Pending tasks to plan", value: backlog ? pending.length : "…", hint: "status PENDING", status: "info" },
          { label: "Already committed", value: backlog ? committed : "…", hint: "SCHEDULED / IN_PROGRESS — not re-planned", status: "neutral" },
          { label: "Block windows in horizon", value: windows ? windows.windows.length : "…", hint: windows ? `${available} available` : undefined, status: "neutral" },
          { label: "Horizon", value: settings ? `${settings.horizonDays} days` : "…", hint: settings ? `from ${settings.planningDate}` : undefined, status: "neutral" },
          { label: "Solver limit", value: settings ? `${settings.solver.timeLimitSeconds} s` : "…", hint: "per solve", status: "neutral" },
        ]}
      />

      <div className="grid-55-45">
        <SectionPanel title="What the run does">
          <ol style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {steps.map(([label, detail]) => (
              <li key={label}>
                <strong>{label}</strong> — <span className="muted-note">{detail}</span>
              </li>
            ))}
          </ol>
          <p className="muted-note" style={{ marginTop: 10 }}>
            The same inputs are also solved with the earlier one-task-per-section model so the effect of the
            compatibility engine can be compared.
          </p>
        </SectionPanel>

        <SectionPanel
          title="Run result"
          level={3}
          accent={plan ? (plan.validation.passed ? "success" : "critical") : error ? "critical" : "info"}
        >
          {error && <p style={{ color: "var(--state-critical)", marginBottom: 8 }}>{error}</p>}
          {planning && <p className="muted-note">Scoring priorities and solving… this takes a few seconds.</p>}
          {!planning && !plan && !error && <p className="muted-note">No run yet in this session.</p>}
          {plan && !planning && (
            <>
              <KeyValueGrid
                rows={[
                  ["Generated", generatedAt?.toLocaleTimeString("en-GB") ?? "–"],
                  ["Priority source", plan.priority.source === "ML" ? `ML · ${plan.priority.model_version}` : "Dataset score"],
                  ["Solver", <StatusBadge status={plan.solver.status} label={`${plan.solver.status} · ${plan.solver.wall_time_seconds}s`} />],
                  ["Validation", <StatusBadge status={plan.validation.passed ? "PASS" : "FAIL"} label={`${plan.validation.passed ? "PASS" : "FAIL"} · ${plan.validation.checks.length} checks`} />],
                  ["Scheduled", `${plan.kpis.tasks_scheduled} of ${plan.kpis.tasks_considered}`],
                  ["Priority-weighted", `${plan.kpis.priority_weighted_completion_pct}%`],
                ]}
              />
              {plan.priority.note && (
                <p style={{ marginTop: 8, color: "var(--state-warning)", fontSize: 12 }}>{plan.priority.note}</p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button type="button" className="btn-rail btn-rail-primary" onClick={() => navigate("/schedule")}>
                  Open schedule
                </button>
                <button type="button" className="btn-rail btn-rail-secondary" onClick={() => navigate("/optimizer")}>
                  Solver details
                </button>
                <button type="button" className="btn-rail btn-rail-secondary" onClick={() => navigate("/validation")}>
                  Validation
                </button>
              </div>
            </>
          )}
        </SectionPanel>
      </div>
    </>
  );
}
