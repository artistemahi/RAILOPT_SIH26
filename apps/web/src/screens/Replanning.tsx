import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { listPlanVersions, replanPlanVersion } from "../services/planVersionsService";
import { usePlan } from "../state/PlanContext";
import type { PlanVersion, PlanVersionSummary } from "../types/versions";
import type { WhatIfChange } from "../types/whatIf";
import { ChangeBuilder } from "./ChangeBuilder";
import { DecisionActions, KpiComparison, PlanDiff, PlannerNameInput } from "./versionParts";

export default function Replanning() {
  const navigate = useNavigate();
  const { plannerName, showVersion } = usePlan();
  const [approved, setApproved] = useState<PlanVersionSummary | null | undefined>(undefined);
  const [disruptionTime, setDisruptionTime] = useState("");
  const [changes, setChanges] = useState<WhatIfChange[]>([]);
  const [reason, setReason] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanVersion | null>(null);
  // The version the proposal was made from (stays fixed after approval).
  const [base, setBase] = useState<PlanVersionSummary | null>(null);

  useEffect(() => {
    listPlanVersions()
      .then((versions) => {
        const current = versions.find((item) => item.planType === "WEEKLY" && item.status === "APPROVED") ?? null;
        setApproved(current);
        if (current) {
          const freeze = current.triggerDetail?.freezeBefore;
          setDisruptionTime((freeze ?? `${current.planningDate} 08:00`).slice(0, 16).replace(" ", "T"));
        }
      })
      .catch(() => setError("Plan versions are unavailable. Check the API connection."));
  }, [result?.status]);

  const horizonEnd = approved
    ? new Date(new Date(`${approved.planningDate}T00:00:00`).getTime() + approved.horizonDays * 86_400_000 - 60_000)
    : null;
  const minTime = (approved?.triggerDetail?.freezeBefore ?? (approved ? `${approved.planningDate} 00:00` : "")).slice(0, 16).replace(" ", "T");
  const maxTime = horizonEnd
    ? `${horizonEnd.getFullYear()}-${String(horizonEnd.getMonth() + 1).padStart(2, "0")}-${String(horizonEnd.getDate()).padStart(2, "0")}T23:59`
    : "";

  async function run() {
    if (!approved) return;
    setRunning(true);
    setError(null);
    try {
      const created = await replanPlanVersion(approved.runId, {
        actor: plannerName,
        reason,
        disruptionTime: disruptionTime.replace("T", " "),
        changes,
      });
      setBase(approved);
      setResult(created);
      showVersion(created);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Replanning failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        section="REPLANNING"
        title="Emergency replanning"
        subtitle="A disruption hits the approved plan: work already started is frozen, the rest is re-optimised by CP-SAT close to the approved plan, and the planner decides"
      />

      {approved === undefined && <p className="muted-note">Loading approved plan…</p>}
      {approved === null && (
        <SectionPanel title="No approved plan" accent="warning">
          <p className="muted-note" style={{ marginBottom: 8 }}>
            Emergency replanning starts from the weekly plan in force. Approve a weekly version first.
          </p>
          <button type="button" className="btn-rail btn-rail-primary" onClick={() => navigate("/versions")}>
            Go to plan versions
          </button>
        </SectionPanel>
      )}

      {approved && (
        <>
          <MetricStrip
            metrics={[
              { label: "Plan in force", value: `V${approved.version}`, hint: `approved by ${approved.decidedBy ?? "–"}`, status: "success" },
              { label: "Scheduled", value: approved.kpis.tasks_scheduled, status: "neutral" },
              { label: "Priority-weighted", value: `${approved.kpis.priority_weighted_completion_pct}%`, status: "neutral" },
              { label: "Horizon", value: `${approved.horizonDays} days`, hint: `from ${approved.planningDate}`, status: "neutral" },
            ]}
          />

          <SectionPanel title="1 · Disruption" level={3} accent="warning">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 320 }}>
                <span className="kv-label">Disruption time — work that started before this is frozen</span>
                <input
                  type="datetime-local"
                  className="rail-input"
                  value={disruptionTime}
                  min={minTime}
                  max={maxTime}
                  onChange={(event) => setDisruptionTime(event.target.value)}
                />
              </label>
              <div>
                <div className="kv-label" style={{ marginBottom: 4 }}>What happened</div>
                <ChangeBuilder
                  types={["WINDOW_UNAVAILABLE", "WINDOW_SHORTEN", "RESOURCE_UNAVAILABLE", "TRAIN_ADD", "TASK_DURATION", "TASK_PRIORITY"]}
                  changes={changes}
                  onChange={setChanges}
                />
              </div>
              <p className="muted-note">
                A disruption is applied to the remaining planning period. Synthetic scenario input — RAILOPT does not
                receive live incident feeds.
              </p>
              <PlannerNameInput />
              <textarea
                className="rail-input"
                rows={2}
                placeholder="Reason / incident description (required)"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              {error && <p style={{ color: "var(--state-critical)" }}>{error}</p>}
              <div>
                <button
                  type="button"
                  className="btn-rail btn-rail-primary"
                  disabled={running || !changes.length || !reason.trim() || !plannerName.trim() || !disruptionTime}
                  onClick={() => void run()}
                >
                  {running ? "Re-optimising…" : `Replan V${approved.version}`}
                </button>
              </div>
            </div>
          </SectionPanel>

          {result && base && result.plan.replan && (
            <>
              <SectionPanel
                title={`2 · Proposed V${result.version}`}
                subtitle={`Solver ${result.solverStatus} · independent validation ${result.validationPassed ? "PASS" : "FAIL"}`}
                action={<StatusBadge status={result.status} />}
              >
                <KpiComparison before={base} after={result} />
                <div style={{ marginTop: 12 }}>
                  <PlanDiff details={result.plan.replan} />
                </div>
              </SectionPanel>

              <SectionPanel title="3 · Planner decision" level={3} accent="navy">
                <DecisionActions version={result} onDecided={(summary) => setResult({ ...result, ...summary })} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" className="btn-rail btn-rail-ghost" onClick={() => navigate("/schedule")}>
                    View V{result.version} schedule
                  </button>
                  <button type="button" className="btn-rail btn-rail-ghost" onClick={() => navigate("/versions")}>
                    Modify in plan versions
                  </button>
                </div>
              </SectionPanel>
            </>
          )}
        </>
      )}
    </>
  );
}
