import { useMemo, useState } from "react";
import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getBlockWindows } from "../services/workspaceService";
import { usePlan } from "../state/PlanContext";
import { ErrorNote, KeyValueGrid, Loading, dayLabel } from "./common";

const impactStatus = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" } as const;

export default function Blocks() {
  const { data, error } = useApi(getBlockWindows);
  const { plan } = usePlan();
  const [day, setDay] = useState<number | "ALL">("ALL");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const plannedByWindow = useMemo(() => {
    const map = new Map<string, NonNullable<typeof plan>["assignments"]>();
    for (const item of plan?.assignments ?? []) {
      map.set(item.window_id, [...(map.get(item.window_id) ?? []), item]);
    }
    return map;
  }, [plan]);

  if (error) return <ErrorNote message="Block windows are unavailable. Check the API connection." />;
  if (!data) return <Loading what="block windows" />;

  const dayOf = (start: string) =>
    Math.floor((new Date(start.replace(" ", "T")).getTime() - new Date(`${data.planningDate}T00:00:00`).getTime()) / 86_400_000);
  const rows = data.windows.filter(
    (window) => (day === "ALL" || dayOf(window.start) === day) && (!onlyAvailable || window.available),
  );
  const available = data.windows.filter((window) => window.available);
  const selected = data.windows.find((window) => window.windowId === selectedId) ?? null;
  const planned = selected ? plannedByWindow.get(selected.windowId) ?? [] : [];

  return (
    <>
      <PageHeader
        section="BLOCK WINDOWS"
        title="Maintenance block windows in the horizon"
        subtitle={`Windows from the dataset (block_windows.csv) for ${data.horizonDays} days from ${data.planningDate}`}
      />

      <MetricStrip
        metrics={[
          { label: "Windows", value: data.windows.length, status: "neutral" },
          { label: "Available", value: available.length, hint: `${data.windows.length - available.length} unavailable`, status: "success" },
          { label: "Available minutes", value: available.reduce((sum, window) => sum + window.durationMin, 0), status: "info" },
          { label: "High train impact", value: data.windows.filter((window) => window.impact === "High").length, hint: "≥ 7 overlapping trains", status: "danger" },
          { label: "Used by latest plan", value: plan ? plannedByWindow.size : "–", hint: plan ? "windows with planned work" : "no plan yet", status: "neutral" },
        ]}
      />

      <div className="rail-toolbar">
        <div className="chip-row">
          <button type="button" className={`filter-chip ${day === "ALL" ? "active" : ""}`} onClick={() => setDay("ALL")}>
            All days
          </button>
          {Array.from({ length: data.horizonDays }, (_, index) => (
            <button key={index} type="button" className={`filter-chip ${day === index ? "active" : ""}`} onClick={() => setDay(index)}>
              {dayLabel(data.planningDate, index)}
            </button>
          ))}
          <label className="rail-checkbox-label">
            <input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} /> Available only
          </label>
        </div>
      </div>

      <div className="grid-65-35">
        <SectionPanel noPadding>
          <DataTable
            data={rows}
            keyField="windowId"
            selectedId={selectedId ?? undefined}
            onRowClick={(row) => setSelectedId(row.windowId)}
            maxHeight={600}
            columns={[
              { header: "Window", accessor: (row) => <span className="cell-id">{row.windowId}</span>, width: 95 },
              { header: "Block type", accessor: "blockType", width: 140 },
              { header: "Sections", accessor: (row) => row.sections.join(", ") },
              { header: "Start", accessor: (row) => <span className="cell-mono">{row.start.slice(5)}</span>, width: 110 },
              { header: "Min", accessor: "durationMin", width: 55 },
              { header: "Trains", accessor: (row) => <StatusBadge status={impactStatus[row.impact]} label={`${row.overlappingTrains}`} />, width: 70 },
              { header: "Status", accessor: (row) => <StatusBadge status={row.available ? "AVAILABLE" : "BLOCKED"} label={row.status} />, width: 115 },
              { header: "Planned", accessor: (row) => (plan ? plannedByWindow.get(row.windowId)?.length ?? 0 : "–"), width: 70 },
            ]}
          />
        </SectionPanel>

        <SectionPanel title={selected ? selected.windowId : "Window details"} level={3} accent="navy">
          {selected ? (
            <>
              <KeyValueGrid
                rows={[
                  ["Block", selected.blockId],
                  ["Type", selected.blockType],
                  ["Sections", selected.sections.join(", ")],
                  ["Time", `${selected.start} → ${selected.end.slice(11)}`],
                  ["Duration", `${selected.durationMin} min`],
                  ["Trains overlapping (primary section)", selected.overlappingTrains],
                  ["Pending tasks on these sections", selected.pendingTasks],
                  ["Status", selected.status],
                ]}
              />
              <div style={{ marginTop: 10 }}>
                <strong>Planned in this window</strong>
                {!plan ? (
                  <p className="muted-note">Generate a plan to see assigned tasks.</p>
                ) : planned.length ? (
                  <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                    {planned.map((item) => (
                      <li key={item.task_id}>
                        <span className="cell-id">{item.task_id}</span> · {item.department} · {item.section_id} ·{" "}
                        {item.start.slice(11)}–{item.end.slice(11)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-note">No task planned in this window.</p>
                )}
              </div>
            </>
          ) : (
            <p className="muted-note">Select a window.</p>
          )}
        </SectionPanel>
      </div>
    </>
  );
}
