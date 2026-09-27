import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import {
  getPlanEvents,
  getPlanVersion,
  listPlanVersions,
  modifyPlanVersion,
} from "../services/planVersionsService";
import { usePlan } from "../state/PlanContext";
import type { PlanEvent, PlanVersion, PlanVersionSummary } from "../types/versions";
import type { WhatIfChange } from "../types/whatIf";
import { ChangeBuilder, describeChange } from "./ChangeBuilder";
import { GenerateButton, KeyValueGrid } from "./common";
import {
  DecisionActions,
  KpiComparison,
  PlanDiff,
  PlannerNameInput,
  statusTone,
  triggerLabels,
} from "./versionParts";

function ModifyPanel({ version, onCreated }: { version: PlanVersion; onCreated: (created: PlanVersion) => void }) {
  const { plannerName } = usePlan();
  const [changes, setChanges] = useState<WhatIfChange[]>([]);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [pinTask, setPinTask] = useState("");
  const [pinWindow, setPinWindow] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const movable = useMemo(
    () =>
      (version.plan.task_details ?? []).filter(
        (task) => task.candidate_windows.length > (task.scheduled_window ? 1 : 0),
      ),
    [version],
  );
  const pinOptions = movable.find((task) => task.task_id === pinTask);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onCreated(await modifyPlanVersion(version.runId, { actor: plannerName, reason, changes, pins }));
      setChanges([]);
      setPins({});
      setReason("");
    } catch (modifyError) {
      setError(modifyError instanceof Error ? modifyError.message : "Modification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="muted-note">
        Edits create a new DRAFT version, re-solved by CP-SAT close to V{version.version}. V{version.version} itself is not changed.
      </p>
      <div>
        <div className="kv-label" style={{ marginBottom: 4 }}>Put a task in a specific window</div>
        <div className="chip-row">
          <select className="rail-select" value={pinTask} onChange={(event) => { setPinTask(event.target.value); setPinWindow(""); }}>
            <option value="">Task…</option>
            {movable.map((task) => (
              <option key={task.task_id} value={task.task_id}>
                {task.task_id} · {task.section_id} · {task.priority_score} · {task.scheduled_window ?? "not planned"}
              </option>
            ))}
          </select>
          <select className="rail-select" value={pinWindow} onChange={(event) => setPinWindow(event.target.value)} disabled={!pinOptions}>
            <option value="">Feasible window…</option>
            {pinOptions?.candidate_windows
              .filter((windowId) => windowId !== pinOptions.scheduled_window)
              .map((windowId) => (
                <option key={windowId} value={windowId}>{windowId}</option>
              ))}
          </select>
          <button
            type="button"
            className="btn-rail btn-rail-secondary"
            disabled={!pinTask || !pinWindow}
            onClick={() => {
              setPins({ ...pins, [pinTask]: pinWindow });
              setPinTask("");
              setPinWindow("");
            }}
          >
            Add
          </button>
          {Object.entries(pins).map(([taskId, windowId]) => (
            <span key={taskId} className="filter-chip active">
              {taskId} → {windowId}{" "}
              <button
                type="button"
                aria-label="Remove pin"
                style={{ fontWeight: 700 }}
                onClick={() => setPins(Object.fromEntries(Object.entries(pins).filter(([other]) => other !== taskId)))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="kv-label" style={{ marginBottom: 4 }}>Other edits</div>
        <ChangeBuilder types={["TASK_REMOVE", "TASK_PRIORITY", "WINDOW_UNAVAILABLE"]} changes={changes} onChange={setChanges} />
      </div>
      <PlannerNameInput />
      <textarea className="rail-input" rows={2} placeholder="Reason for the modification (required)" value={reason} onChange={(event) => setReason(event.target.value)} />
      {error && <p style={{ color: "var(--state-critical)" }}>{error}</p>}
      <div>
        <button
          type="button"
          className="btn-rail btn-rail-primary"
          disabled={busy || !plannerName.trim() || !reason.trim() || (!changes.length && !Object.keys(pins).length)}
          onClick={() => void submit()}
        >
          {busy ? "Solving…" : "Create modified version"}
        </button>
      </div>
    </div>
  );
}

export default function Versions() {
  const navigate = useNavigate();
  const { version: inView, showVersion } = usePlan();
  const [versions, setVersions] = useState<PlanVersionSummary[] | null>(null);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [selected, setSelected] = useState<PlanVersion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, log] = await Promise.all([listPlanVersions(), getPlanEvents()]);
      setVersions(list);
      setEvents(log);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Plan versions are unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, inView?.runId]);

  const select = useCallback(async (runId: string) => {
    setSelected(await getPlanVersion(runId));
  }, []);

  useEffect(() => {
    if (!selected && versions?.length) void select((inView ?? versions[0]!).runId);
  }, [versions, inView, selected, select]);

  const parent = versions?.find((item) => item.runId === selected?.parentRunId) ?? null;

  return (
    <>
      <PageHeader
        section="PLAN VERSIONS"
        title="Versions and approval"
        subtitle="Every generated, modified or replanned plan is a version. RAILOPT recommends; the planner approves, modifies or rejects."
        action={<GenerateButton label="Generate new version" />}
      />
      {error && <p style={{ color: "var(--state-critical)" }}>{error}</p>}

      <div className="grid-55-45">
        <SectionPanel title="Versions" subtitle={versions ? `${versions.length} stored` : "Loading…"} noPadding>
          <DataTable
            data={versions ?? []}
            keyField="runId"
            selectedId={selected?.runId}
            onRowClick={(row) => void select(row.runId)}
            maxHeight={420}
            emptyMessage="No versions yet — generate a plan."
            columns={[
              { header: "Ver", accessor: (row) => <strong>V{row.version}</strong>, width: 50 },
              { header: "Plan", accessor: (row) => (row.planType === "MONTHLY" ? "Monthly" : "Weekly"), width: 70 },
              { header: "Type", accessor: (row) => triggerLabels[row.triggerType], width: 150 },
              { header: "Status", accessor: (row) => <StatusBadge status={statusTone[row.status] ?? row.status} label={row.status} />, width: 110 },
              { header: "Scheduled", accessor: (row) => row.kpis.tasks_scheduled, width: 80 },
              { header: "Weighted", accessor: (row) => `${row.kpis.priority_weighted_completion_pct}%`, width: 75 },
              { header: "Valid", accessor: (row) => (row.validationPassed ? "PASS" : "FAIL"), width: 55 },
              { header: "Created", accessor: (row) => <span className="cell-mono">{row.createdAt.slice(5, 16)}</span>, width: 100 },
            ]}
          />
        </SectionPanel>

        <SectionPanel
          title={selected ? `V${selected.version} · ${selected.planType === "MONTHLY" ? "Monthly plan" : triggerLabels[selected.triggerType]}` : "Version"}
          subtitle={selected ? `Run ${selected.runId}${parent ? ` · from V${parent.version}` : ""}` : undefined}
          level={3}
          accent={selected?.status === "APPROVED" ? "success" : selected?.status === "REJECTED" ? "critical" : "navy"}
          action={
            selected?.planType === "MONTHLY" ? (
              <button type="button" className="btn-rail btn-rail-secondary" onClick={() => navigate("/monthly")}>
                Open monthly plan
              </button>
            ) : selected && (
              <button
                type="button"
                className="btn-rail btn-rail-secondary"
                disabled={inView?.runId === selected.runId}
                onClick={() => showVersion(selected)}
              >
                {inView?.runId === selected.runId ? "Shown in all screens" : "Show in all screens"}
              </button>
            )
          }
        >
          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <KeyValueGrid
                rows={[
                  ["Status", <StatusBadge status={statusTone[selected.status] ?? selected.status} label={selected.status} />],
                  ["Solver", selected.solverStatus],
                  ["Validation", selected.validationPassed ? "PASS" : "FAIL"],
                  ["Scheduled", `${selected.kpis.tasks_scheduled} / ${selected.kpis.tasks_considered}`],
                ]}
              />
              {selected.triggerDetail && (
                <p className="muted-note">
                  {selected.triggerDetail.freezeBefore && <>Frozen before {selected.triggerDetail.freezeBefore.slice(0, 16)}. </>}
                  {(selected.triggerDetail.newChanges ?? []).map(describeChange).join(" · ")}
                  {Object.entries(selected.triggerDetail.newPins ?? {}).map(([taskId, windowId]) => ` · ${taskId} → ${windowId}`).join("")}
                </p>
              )}
              <DecisionActions
                version={selected}
                onDecided={(summary) => {
                  setSelected({ ...selected, ...summary });
                  void refresh();
                }}
              />
            </div>
          ) : (
            <p className="muted-note">Select a version.</p>
          )}
        </SectionPanel>
      </div>

      {selected && parent && (
        <SectionPanel title={`V${selected.version} compared with V${parent.version}`}>
          <KpiComparison before={parent} after={selected} />
          {selected.plan.replan && (
            <div style={{ marginTop: 12 }}>
              <PlanDiff details={selected.plan.replan} />
            </div>
          )}
        </SectionPanel>
      )}

      {selected && selected.planType === "WEEKLY" && (selected.status === "DRAFT" || selected.status === "APPROVED") && (
        <SectionPanel title={`Modify V${selected.version}`}>
          <ModifyPanel
            version={selected}
            onCreated={(created) => {
              setSelected(created);
              showVersion(created);
              void refresh();
            }}
          />
        </SectionPanel>
      )}

      {selected?.planType === "WEEKLY" && selected.status === "APPROVED" && (
        <SectionPanel title="Disruption on the approved plan?" accent="warning">
          <button type="button" className="btn-rail btn-rail-secondary" onClick={() => navigate("/replanning")}>
            Open emergency replanning
          </button>
        </SectionPanel>
      )}

      <SectionPanel title="Audit log" subtitle="Every creation and decision, newest first" noPadding>
        <DataTable
          data={events}
          keyField="eventId"
          maxHeight={320}
          emptyMessage="No events yet."
          columns={[
            { header: "Time", accessor: (row) => <span className="cell-mono">{row.createdAt}</span>, width: 160 },
            {
              header: "Version",
              accessor: (row) => {
                const item = versions?.find((candidate) => candidate.runId === row.runId);
                return item ? `V${item.version}` : row.runId;
              },
              width: 70,
            },
            { header: "Event", accessor: (row) => <StatusBadge status={row.eventType === "APPROVED" ? "APPROVED" : row.eventType === "REJECTED" ? "CRITICAL" : "neutral"} label={row.eventType} />, width: 120 },
            { header: "By", accessor: "actor", width: 130 },
            { header: "Reason", accessor: (row) => row.reason ?? "–" },
          ]}
        />
      </SectionPanel>
    </>
  );
}
