import { useMemo, useState } from "react";
import { DataTable, PageHeader, SectionPanel } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getBlockWindows } from "../services/workspaceService";
import { usePlan } from "../state/PlanContext";
import type { BlockPlanAssignment } from "../types/planner";
import { DAY_MINUTES, GenerateButton, PlanRequired, dayLabel, departmentColors } from "./common";

const LANE_HEIGHT = 24;

/** Stack tasks that overlap in time on one section into separate lanes. */
function assignLanes(items: BlockPlanAssignment[]) {
  const laneEnds: number[] = [];
  return [...items]
    .sort((a, b) => a.start_minute - b.start_minute)
    .map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start_minute);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.end_minute;
      return { ...item, lane };
    });
}

export default function Schedule() {
  const { plan } = usePlan();
  const { data: windows } = useApi(getBlockWindows);
  const [day, setDay] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dayStart = day * DAY_MINUTES;
  const dayEnd = dayStart + DAY_MINUTES;
  const visible = useMemo(
    () => (plan?.assignments ?? []).filter((item) => item.start_minute < dayEnd && item.end_minute > dayStart),
    [plan, dayStart, dayEnd],
  );

  // Available block windows on this day, per section, drawn behind the tasks.
  const windowBands = useMemo(() => {
    if (!plan || !windows) return new Map<string, Array<{ id: string; start: number; end: number }>>();
    const base = new Date(`${plan.planning_date}T00:00:00`).getTime();
    const bands = new Map<string, Array<{ id: string; start: number; end: number }>>();
    for (const window of windows.windows) {
      if (!window.available) continue;
      const start = (new Date(window.start.replace(" ", "T")).getTime() - base) / 60_000;
      const end = (new Date(window.end.replace(" ", "T")).getTime() - base) / 60_000;
      if (start >= dayEnd || end <= dayStart) continue;
      for (const section of window.sections) {
        bands.set(section, [...(bands.get(section) ?? []), { id: window.windowId, start, end }]);
      }
    }
    return bands;
  }, [plan, windows, dayStart, dayEnd]);

  const sections = [...new Set([...visible.map((item) => item.section_id), ...windowBands.keys()])].sort();
  const pct = (minute: number) => `${((Math.min(Math.max(minute, dayStart), dayEnd) - dayStart) / DAY_MINUTES) * 100}%`;
  const width = (start: number, end: number) =>
    `${Math.max(((Math.min(end, dayEnd) - Math.max(start, dayStart)) / DAY_MINUTES) * 100, 0.5)}%`;

  return (
    <>
      <PageHeader
        section="WEEKLY SCHEDULE"
        title="Weekly block plan"
        subtitle="CP-SAT assignment of pending tasks to block windows · recommendation for planner review, not an authorised block"
        action={<GenerateButton />}
      />
      <PlanRequired>
        {plan && (
          <>
            <div className="rail-toolbar">
              <div className="chip-row">
                {Array.from({ length: plan.horizon_days }, (_, index) => {
                  const count = plan.assignments.filter((item) => Math.floor(item.start_minute / DAY_MINUTES) === index).length;
                  return (
                    <button key={index} type="button" className={`filter-chip ${day === index ? "active" : ""}`} onClick={() => setDay(index)}>
                      {dayLabel(plan.planning_date, index)} · {count}
                    </button>
                  );
                })}
                <span style={{ marginLeft: "auto" }} className="chip-row">
                  {Object.entries(departmentColors).map(([department, color]) => (
                    <span key={department} style={{ fontSize: 11 }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, background: color, borderRadius: 2, marginRight: 4 }} />
                      {department}
                    </span>
                  ))}
                  <span style={{ fontSize: 11 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--state-info-bg)", border: "1px dashed var(--state-info)", marginRight: 4 }} />
                    Available window
                  </span>
                </span>
              </div>
            </div>

            <SectionPanel title={`Gantt · ${dayLabel(plan.planning_date, day)}`} subtitle={`${visible.length} task(s) on ${sections.length} section(s)`}>
              {sections.length === 0 ? (
                <p className="muted-note">No windows or planned work on this day.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 780 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", fontSize: 10, color: "var(--text-muted)", borderBottom: "1px solid var(--border-default)" }}>
                      <span style={{ padding: "4px 6px" }}>Section</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
                        {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((label) => (
                          <span key={label} style={{ padding: "4px 4px", borderLeft: "1px solid var(--border-subtle)" }}>{label}</span>
                        ))}
                      </div>
                    </div>
                    {sections.map((section) => {
                      const lanes = assignLanes(visible.filter((item) => item.section_id === section));
                      const laneCount = Math.max(1, ...lanes.map((item) => item.lane + 1));
                      return (
                        <div key={section} style={{ display: "grid", gridTemplateColumns: "90px 1fr", borderBottom: "1px solid var(--border-subtle)" }}>
                          <div style={{ padding: "6px", background: "var(--bg-subtle)", fontSize: 11, fontWeight: 600 }}>
                            {section}
                            {laneCount > 1 && <div className="muted-note" style={{ fontSize: 9 }}>{laneCount} parallel</div>}
                          </div>
                          <div style={{ position: "relative", height: laneCount * LANE_HEIGHT + 8 }}>
                            {(windowBands.get(section) ?? []).map((band) => (
                              <div
                                key={band.id}
                                title={`${band.id} (available window)`}
                                style={{
                                  position: "absolute", top: 0, bottom: 0, left: pct(band.start), width: width(band.start, band.end),
                                  background: "var(--state-info-bg)", borderLeft: "1px dashed var(--state-info)", borderRight: "1px dashed var(--state-info)",
                                }}
                              />
                            ))}
                            {lanes.map((item) => (
                              <button
                                key={item.task_id}
                                type="button"
                                onClick={() => setSelectedId(item.task_id)}
                                title={`${item.task_id} · ${item.department} · ${item.start.slice(11)}–${item.end.slice(11)} · ${item.window_id} · priority ${item.priority_score}`}
                                style={{
                                  position: "absolute", top: 4 + item.lane * LANE_HEIGHT, height: LANE_HEIGHT - 4,
                                  left: pct(item.start_minute), width: width(item.start_minute, item.end_minute),
                                  background: departmentColors[item.department] ?? "#475569", color: "#fff",
                                  fontSize: 9, fontWeight: 600, borderRadius: 3, overflow: "hidden", whiteSpace: "nowrap", padding: "0 3px",
                                  outline: selectedId === item.task_id ? "2px solid #D9822B" : "none",
                                }}
                              >
                                {item.task_id.replace("TASK_", "")}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionPanel>

            <SectionPanel title={`All scheduled tasks (${plan.assignments.length})`} noPadding>
              <DataTable
                data={[...plan.assignments].sort((a, b) => a.start_minute - b.start_minute)}
                keyField="task_id"
                selectedId={selectedId ?? undefined}
                onRowClick={(row) => {
                  setSelectedId(row.task_id);
                  setDay(Math.floor(row.start_minute / DAY_MINUTES));
                }}
                maxHeight={420}
                columns={[
                  { header: "Task", accessor: (row) => <span className="cell-id">{row.task_id}</span>, width: 110 },
                  { header: "Dept", accessor: "department", width: 110 },
                  { header: "Section", accessor: "section_id", width: 80 },
                  { header: "Window", accessor: "window_id", width: 90 },
                  { header: "Block", accessor: "block_id", width: 90 },
                  { header: "Start", accessor: (row) => <span className="cell-mono">{row.start}</span> },
                  { header: "End", accessor: (row) => <span className="cell-mono">{row.end.slice(11)}</span>, width: 70 },
                  { header: "Priority", accessor: "priority_score", width: 70 },
                ]}
              />
            </SectionPanel>
          </>
        )}
      </PlanRequired>
    </>
  );
}
