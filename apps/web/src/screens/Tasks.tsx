import { useMemo, useState } from "react";
import { DataTable, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getBacklog } from "../services/workspaceService";
import { usePlan } from "../state/PlanContext";
import { ErrorNote, GenerateButton, KeyValueGrid, Loading, reasonLabels } from "./common";

const priorityStatus = { P1: "CRITICAL", P2: "WARNING", P3: "LOW" } as const;

export default function Tasks() {
  const { data, error } = useApi(getBacklog);
  const { plan } = usePlan();
  const [status, setStatus] = useState("PENDING");
  const [department, setDepartment] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const details = useMemo(
    () => new Map((plan?.task_details ?? []).map((detail) => [detail.task_id, detail])),
    [plan],
  );

  if (error) return <ErrorNote message="Task backlog is unavailable. Check the API connection." />;
  if (!data) return <Loading what="task backlog" />;

  const departments = [...new Set(data.tasks.map((task) => task.department))].sort();
  const rows = data.tasks.filter(
    (task) =>
      (status === "ALL" || task.status === status) &&
      (department === "ALL" || task.department === department) &&
      (!query || `${task.taskId} ${task.assetId} ${task.task} ${task.sectionId}`.toLowerCase().includes(query.toLowerCase())),
  );
  const selected = data.tasks.find((task) => task.taskId === (selectedId ?? rows[0]?.taskId)) ?? null;
  const detail = selected ? details.get(selected.taskId) : undefined;

  return (
    <>
      <PageHeader
        section="MAINTENANCE TASKS"
        title="Active maintenance backlog"
        subtitle={`${data.tasks.length} active tasks (PENDING, SCHEDULED, IN_PROGRESS) · only PENDING work is planned`}
        action={<GenerateButton />}
      />

      <div className="rail-toolbar">
        <div className="chip-row">
          {["PENDING", "SCHEDULED", "IN_PROGRESS", "ALL"].map((value) => (
            <button key={value} type="button" className={`filter-chip ${status === value ? "active" : ""}`} onClick={() => setStatus(value)}>
              {value} {value !== "ALL" ? `(${data.statusCounts[value] ?? 0})` : ""}
            </button>
          ))}
          <select className="rail-select" value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="ALL">All departments</option>
            {departments.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input
            className="rail-input"
            placeholder="Search task, asset, section…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="muted-note">{rows.length} shown</span>
        </div>
      </div>

      <div className="grid-65-35">
        <SectionPanel noPadding>
          <DataTable
            data={rows}
            keyField="taskId"
            selectedId={selected?.taskId}
            onRowClick={(row) => setSelectedId(row.taskId)}
            maxHeight={620}
            columns={[
              { header: "Task", accessor: (row) => <span className="cell-id">{row.taskId}</span>, width: 110 },
              { header: "Work", accessor: "task" },
              { header: "Dept", accessor: "department", width: 105 },
              { header: "Section", accessor: "sectionId", width: 80 },
              {
                header: "Priority",
                accessor: (row) => <StatusBadge status={priorityStatus[row.priority]} label={`${row.priority} · ${row.priorityScore}`} />,
                width: 95,
              },
              { header: "Source", accessor: "scoreSource", width: 85 },
              { header: "Overdue", accessor: (row) => (row.overdueDays > 0 ? `${row.overdueDays} d` : "–"), width: 70 },
              {
                header: "Plan",
                accessor: (row) => {
                  const item = details.get(row.taskId);
                  if (!item) return <span className="muted-note">–</span>;
                  return item.scheduled_window ? (
                    <StatusBadge status="PLANNED" label={item.scheduled_window} />
                  ) : (
                    <StatusBadge status={item.candidate_windows.length ? "HOLD" : "BLOCKED"} label={item.candidate_windows.length ? "Not selected" : "No window"} />
                  );
                },
                width: 115,
              },
            ]}
          />
        </SectionPanel>

        <SectionPanel title={selected ? selected.taskId : "Task"} subtitle={selected?.task} level={3} accent="navy">
          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <KeyValueGrid
                rows={[
                  ["Asset", selected.assetId],
                  ["Section", selected.sectionId],
                  ["Department", selected.department],
                  ["Status", selected.status],
                  ["Due", selected.dueDate ?? "–"],
                  ["Open defects on asset", selected.openDefects],
                  ["Priority score", `${selected.priorityScore} (${selected.scoreSource})`],
                ]}
              />
              {selected.overrideReason && <p className="muted-note">Override: {selected.overrideReason}</p>}

              {selected.status !== "PENDING" ? (
                <p className="muted-note">Committed work — not re-planned by the optimizer.</p>
              ) : !plan ? (
                <p className="muted-note">Generate a plan to see candidate windows and rejection reasons for this task.</p>
              ) : detail ? (
                <>
                  <div>
                    <strong>Candidate windows ({detail.candidate_windows.length})</strong>
                    <div className="chip-row" style={{ marginTop: 4 }}>
                      {detail.candidate_windows.length ? (
                        detail.candidate_windows.map((windowId) => (
                          <StatusBadge
                            key={windowId}
                            status={windowId === detail.scheduled_window ? "PLANNED" : "AVAILABLE"}
                            dot={windowId === detail.scheduled_window}
                            label={windowId === detail.scheduled_window ? `${windowId} · chosen` : windowId}
                          />
                        ))
                      ) : (
                        <span className="muted-note">None — every window was rejected.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <strong>Rejected windows</strong>
                    <div className="bar-list" style={{ marginTop: 4 }}>
                      {Object.entries(detail.rejections).map(([code, count]) => (
                        <div key={code} className="bar-list-row" style={{ gridTemplateColumns: "1fr 50px" }}>
                          <span>{reasonLabels[code] ?? code}</span>
                          <span className="bar-value">{count}</span>
                        </div>
                      ))}
                    </div>
                    <ul style={{ marginTop: 6, paddingLeft: 16 }} className="muted-note">
                      {detail.rejection_examples.map((example, index) => (
                        <li key={index}>
                          {example.window_id ?? "task"}: {example.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {!detail.scheduled_window && (
                    <p className="muted-note">
                      Outcome: {plan.unscheduled.find((item) => item.task_id === selected.taskId)?.reason ?? "not scheduled"}
                    </p>
                  )}
                </>
              ) : (
                <p className="muted-note">This task was not part of the latest run.</p>
              )}
            </div>
          ) : (
            <p className="muted-note">No task matches the filters.</p>
          )}
        </SectionPanel>
      </div>
    </>
  );
}
