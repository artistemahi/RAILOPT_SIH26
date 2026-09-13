import { pool } from "../config/database.js";

type PlanningSummary = { label: string; value: string; subtext?: string; tone?: "default" | "success" | "warning" | "danger" };
type PlanningBlock = { id: string; rowId: string; section: string; startHour: number; endHour: number; impact: "Low" | "Medium" | "High" | "Approved"; status: "Low Impact" | "Medium Impact" | "High Impact" | "Approved"; blockStatus: string; solverStatus: string | null; startLabel: string; endLabel: string; duration: string };
type GanttRow = { id: string; label: string; section: string; blocks: PlanningBlock[] };
type SelectedBlock = { id: string; section: string; timeWindow: string; duration: string; tasksScheduled: number; trainImpact: "High" | "Medium" | "Low"; priorityCoverage: "High" | "Medium" | "Low"; reason: string; blockStatus: string; solverStatus: string | null };
type ConstraintStatus = { name: string; state: "OK" | "Warning" | "Conflict"; value: string };
type PendingTask = { assetId: string; task: string; department: string; section: string; riskScore: number; priority: "P1" | "P2" | "P3"; reason: string };
type PlannerTrain = { train_key: string; station_id: string; stop_order: number; scheduled_departure: string; predicted_delay_min: number };
export type BlockPlannerResponse = { summary: PlanningSummary[]; rows: GanttRow[]; selectedBlock: SelectedBlock; constraints: ConstraintStatus[]; pendingTasks: PendingTask[]; trains: PlannerTrain[] };

function hour(value: string): number { const d = new Date(value); return d.getHours() + d.getMinutes() / 60; }
function label(value: string): string { return new Date(value).toISOString().slice(11, 16); }
function duration(min: number): string { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")} Hrs`; }

export async function getBlockPlannerData(): Promise<BlockPlannerResponse> {
  const [sections, blocks, windows, tasks, trains] = await Promise.all([
    pool.query(`SELECT section_id, section_code, operational_status FROM railopt.sections ORDER BY section_code NULLS LAST, section_id`),
    pool.query(`SELECT block_id, block_name, block_type, status, max_duration_min FROM railopt.blocks ORDER BY block_id`),
    pool.query(`SELECT window_id, block_id, section_id, start_time, end_time, duration_min, available, status FROM railopt.block_windows ORDER BY start_time, window_id`),
    pool.query(`SELECT t.task_id, t.asset_id, t.description, t.department, s.section_code, COALESCE(pp.final_priority_score, t.priority_score, 0) AS risk_score FROM railopt.maintenance_tasks t JOIN railopt.sections s ON s.section_id=t.section_id LEFT JOIN LATERAL (SELECT final_priority_score FROM railopt.priority_predictions WHERE task_id=t.task_id ORDER BY created_at DESC LIMIT 1) pp ON TRUE ORDER BY COALESCE(pp.final_priority_score,t.priority_score,0) DESC LIMIT 50`),
    pool.query(`SELECT movement_id, train_id, section_id, entry_time, priority FROM railopt.train_movements ORDER BY entry_time LIMIT 100`),
  ]);

  const blockRows = windows.rows.map((w) => ({
    id: w.block_id,
    rowId: `row-${String(w.section_id).replace(/\W/g, "-")}`,
    section: sections.rows.find((s) => s.section_id === w.section_id)?.section_code ?? w.section_id,
    startHour: hour(w.start_time),
    endHour: hour(w.end_time),
    impact: "Low" as const,
    status: "Low Impact" as const,
    blockStatus: w.available === false ? "Unavailable" : (w.status ?? "Available"),
    solverStatus: null,
    startLabel: label(w.start_time),
    endLabel: label(w.end_time),
    duration: duration(Number(w.duration_min)),
  }));

  const rows = sections.rows.map((s, index) => ({ id: `row-${index + 1}`, label: s.section_code ?? s.section_id, section: s.section_id, blocks: blockRows.filter((b) => b.section === (s.section_code ?? s.section_id) && b.rowId === `row-${String(s.section_id).replace(/\W/g, "-")}`) }));

  const firstWindow = windows.rows[0];
  const firstSection = firstWindow ? sections.rows.find((s) => s.section_id === firstWindow.section_id) : null;
  const selectedTasks = firstWindow ? tasks.rows.filter((t) => t.section_code === firstSection?.section_code) : [];
  const impactTrainCount = firstWindow ? trains.rows.filter((t) => t.section_id === firstWindow.section_id && t.entry_time < firstWindow.end_time && firstWindow.start_time < t.entry_time).length : 0;
  const trainImpact: SelectedBlock["trainImpact"] = impactTrainCount >= 10 ? "High" : impactTrainCount >= 5 ? "Medium" : "Low";
  const priorityCoverage: SelectedBlock["priorityCoverage"] = selectedTasks.some((t) => Number(t.risk_score) >= 80) ? "High" : selectedTasks.length ? "Medium" : "Low";

  return {
    summary: [
      { label: "Sections", value: String(sections.rowCount ?? 0), tone: "default" },
      { label: "Blocks", value: String(blocks.rowCount ?? 0), tone: "default" },
      { label: "Windows", value: String(windows.rowCount ?? 0), tone: "default" },
      { label: "Tasks", value: String(tasks.rowCount ?? 0), tone: "default" },
      { label: "Train Movements", value: String(trains.rowCount ?? 0), tone: "default" },
    ],
    rows,
    selectedBlock: {
      id: firstWindow?.block_id ?? "",
      section: firstSection?.section_code ?? firstWindow?.section_id ?? "",
      timeWindow: firstWindow ? `${label(firstWindow.start_time)} – ${label(firstWindow.end_time)}` : "",
      duration: firstWindow ? duration(Number(firstWindow.duration_min)) : "00:00 Hrs",
      tasksScheduled: selectedTasks.length,
      trainImpact,
      priorityCoverage,
      reason: firstWindow ? "Selected from available planning windows" : "No planning window available",
      blockStatus: firstWindow?.status ?? "Unavailable",
      solverStatus: null,
    },
    constraints: [
      { name: "Window Availability", state: firstWindow?.available ? "OK" : "Warning", value: firstWindow?.available ? "Available" : "No available window" },
      { name: "Train Overlap", state: impactTrainCount ? "Warning" : "OK", value: `${impactTrainCount} movements` },
      { name: "Task Coverage", state: selectedTasks.length ? "OK" : "Warning", value: `${selectedTasks.length} tasks` },
    ],
    pendingTasks: tasks.rows.map((t) => ({ assetId: t.asset_id, task: t.description ?? t.task_id, department: t.department ?? "Unknown", section: t.section_code, riskScore: Number(t.risk_score), priority: Number(t.risk_score) >= 80 ? "P1" : Number(t.risk_score) >= 60 ? "P2" : "P3", reason: "Awaiting optimized block assignment" })),
    trains: trains.rows.map((t, index) => ({ train_key: t.train_id, station_id: t.section_id, stop_order: index + 1, scheduled_departure: t.entry_time, predicted_delay_min: 0 })),
  };
}
