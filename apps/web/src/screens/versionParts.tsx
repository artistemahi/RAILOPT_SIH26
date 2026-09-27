import { useState } from "react";
import { DataTable, SectionPanel, StatusBadge } from "../components/rail";
import { approvePlanVersion, rejectPlanVersion } from "../services/planVersionsService";
import { usePlan } from "../state/PlanContext";
import type { PlanVersionSummary, ReplanDetails } from "../types/versions";
import type { WhatIfSlot } from "../types/whatIf";
import { reasonLabels } from "./common";

export const statusTone: Record<string, string> = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  REJECTED: "CRITICAL",
  SUPERSEDED: "neutral",
};

export const triggerLabels: Record<string, string> = {
  PLAN: "Generated",
  MODIFY: "Planner modification",
  REPLAN: "Emergency replan",
};

export function slotLabel(slot: WhatIfSlot): string {
  return `${slot.window_id} · ${slot.start.slice(5)}–${slot.end.slice(11)}`;
}

export function PlannerNameInput() {
  const { plannerName, setPlannerName } = usePlan();
  return (
    <label className="rail-form-group" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="kv-label">Planner name (recorded in the audit log)</span>
      <input
        className="rail-input"
        value={plannerName}
        placeholder="e.g. section planner"
        onChange={(event) => setPlannerName(event.target.value)}
      />
    </label>
  );
}

/** Approve / Reject a DRAFT version. The planner is the final authority. */
export function DecisionActions({
  version,
  onDecided,
}: {
  version: PlanVersionSummary;
  onDecided: (summary: PlanVersionSummary) => void;
}) {
  const { plannerName, updateSummary } = usePlan();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (version.status !== "DRAFT") {
    return (
      <p className="muted-note">
        V{version.version} is <strong>{version.status}</strong>
        {version.decidedBy ? ` by ${version.decidedBy} at ${version.decidedAt}` : ""}
        {version.decisionReason ? ` — “${version.decisionReason}”` : ""}.
      </p>
    );
  }

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const summary =
        action === "approve"
          ? await approvePlanVersion(version.runId, plannerName, reason)
          : await rejectPlanVersion(version.runId, plannerName, reason);
      updateSummary(summary);
      onDecided(summary);
      setReason("");
    } catch (decideError) {
      setError(decideError instanceof Error ? decideError.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <PlannerNameInput />
      <textarea
        className="rail-input"
        rows={2}
        placeholder="Reason (required to reject)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {!version.validationPassed && (
        <p style={{ color: "var(--state-critical)" }}>Failed independent validation — cannot be approved.</p>
      )}
      {error && <p style={{ color: "var(--state-critical)" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn-rail btn-rail-primary"
          disabled={busy || !plannerName.trim() || !version.validationPassed}
          onClick={() => void decide("approve")}
        >
          Approve V{version.version}
        </button>
        <button
          type="button"
          className="btn-rail btn-rail-danger"
          disabled={busy || !plannerName.trim() || !reason.trim()}
          onClick={() => void decide("reject")}
        >
          Reject
        </button>
      </div>
      <p className="muted-note">
        Approving records the decision; it does not send the plan to any railway system. Approving a new version
        supersedes the previously approved one.
      </p>
    </div>
  );
}

/** KPIs of a version next to its parent's. */
export function KpiComparison({ before, after }: { before: PlanVersionSummary; after: PlanVersionSummary }) {
  const rows = (
    [
      ["Tasks scheduled", "tasks_scheduled", ""],
      ["P1 scheduled", "p1_scheduled", ""],
      ["Priority-weighted completion", "priority_weighted_completion_pct", "%"],
      ["Block utilisation", "block_utilization_pct", "%"],
    ] as const
  ).map(([label, key, unit]) => {
    const delta = Math.round((after.kpis[key] - before.kpis[key]) * 10) / 10;
    return {
      label,
      before: `${before.kpis[key]}${unit}`,
      after: `${after.kpis[key]}${unit}`,
      delta: delta === 0 ? "–" : `${delta > 0 ? "+" : ""}${delta}${unit}`,
      tone: delta < 0 ? "var(--state-critical)" : delta > 0 ? "var(--state-success)" : "var(--text-muted)",
    };
  });
  return (
    <DataTable
      data={[
        ...rows,
        {
          label: "Validation",
          before: before.validationPassed ? "PASS" : "FAIL",
          after: after.validationPassed ? "PASS" : "FAIL",
          delta: "",
          tone: "",
        },
      ]}
      keyField="label"
      columns={[
        { header: "Metric", accessor: "label" },
        { header: `V${before.version}`, accessor: "before", width: 110 },
        { header: `V${after.version}`, accessor: (row) => <strong>{row.after}</strong>, width: 110 },
        { header: "Change", accessor: (row) => <span style={{ color: row.tone, fontWeight: 600 }}>{row.delta}</span>, width: 90 },
      ]}
    />
  );
}

/** What changed between a version and its parent. */
export function PlanDiff({ details }: { details: ReplanDetails }) {
  const { diff } = details;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="chip-row">
        {details.freeze_before && (
          <StatusBadge status="neutral" label={`${details.frozen.length} frozen (started before ${details.freeze_before.slice(5, 16)})`} />
        )}
        <StatusBadge status="PASS" label={`${diff.unchanged} unchanged`} />
        <StatusBadge status="WARNING" label={`${diff.moved.length} moved`} />
        <StatusBadge status="INFO" label={`${diff.added.length} added`} />
        <StatusBadge status="CRITICAL" label={`${diff.removed.length} dropped`} />
        {details.unmet_pins.length > 0 && (
          <StatusBadge status="CRITICAL" label={`Pins not possible: ${details.unmet_pins.join(", ")}`} />
        )}
        {details.frozen_conflicts.length > 0 && (
          <StatusBadge status="CRITICAL" label={`Frozen work no longer in planning: ${details.frozen_conflicts.join(", ")}`} />
        )}
      </div>
      {details.changes.length > 0 && (
        <p className="muted-note">In force: {details.changes.join(" · ")}</p>
      )}
      <div className="grid-2-cols">
        <SectionPanel title={`Dropped (${diff.removed.length})`} accent={diff.removed.length ? "critical" : "none"} noPadding>
          <DataTable
            data={diff.removed}
            keyField="task_id"
            maxHeight={260}
            emptyMessage="No planned task was dropped."
            columns={[
              { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
              { header: "Score", accessor: "priority_score", width: 55 },
              { header: "Was", accessor: (row) => <span className="cell-mono">{slotLabel(row.from)}</span> },
              { header: "Why", accessor: (row) => reasonLabels[row.reason_code] ?? row.reason_code, width: 140 },
            ]}
          />
        </SectionPanel>
        <SectionPanel title={`Moved (${diff.moved.length})`} noPadding>
          <DataTable
            data={diff.moved}
            keyField="task_id"
            maxHeight={260}
            emptyMessage="No task moved."
            columns={[
              { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
              { header: "From", accessor: (row) => <span className="cell-mono">{slotLabel(row.from)}</span> },
              { header: "To", accessor: (row) => <span className="cell-mono">{slotLabel(row.to)}</span> },
            ]}
          />
        </SectionPanel>
        <SectionPanel title={`Added (${diff.added.length})`} noPadding>
          <DataTable
            data={diff.added}
            keyField="task_id"
            maxHeight={220}
            emptyMessage="No task added."
            columns={[
              { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
              { header: "Score", accessor: "priority_score", width: 55 },
              { header: "Now", accessor: (row) => <span className="cell-mono">{slotLabel(row.to)}</span> },
            ]}
          />
        </SectionPanel>
        {details.freeze_before && (
          <SectionPanel title={`Frozen (${details.frozen.length})`} subtitle="Already started — kept as is" noPadding>
            <DataTable
              data={details.frozen}
              keyField="task_id"
              maxHeight={220}
              columns={[
                { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
                { header: "Slot", accessor: (row) => <span className="cell-mono">{slotLabel(row.to)}</span> },
              ]}
            />
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
