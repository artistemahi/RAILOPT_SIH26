import { pool } from "../config/database.js";
import {
  describeTask,
  describeWindowReason,
  formatClock,
  formatDateLabel,
  formatDuration,
  getActiveTasks,
  getPlanningDate,
  getSections,
  getWindowsForDate,
  pickTopCandidateWindow,
  toPriorityCoverage,
  toPriorityLevel,
  type ImpactLevel,
  type PriorityLevel,
  type WindowSummary,
} from "./planning-context.js";

const MAX_PENDING_TASKS = 25;

type PlanningSummary = {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

type PlanningBlock = {
  id: string;
  rowId: string;
  section: string;
  startHour: number;
  endHour: number;
  impact: ImpactLevel | "Unavailable";
  status: "Low Impact" | "Medium Impact" | "High Impact" | "Unavailable";
  blockId: string;
  blockType: string;
  blockStatus: string;
  startLabel: string;
  endLabel: string;
  duration: string;
  candidateTasks: number;
  overlappingTrains: number;
  trainImpact: ImpactLevel;
  priorityCoverage: "High" | "Medium" | "Low";
  reason: string;
};

type GanttRow = {
  id: string;
  label: string;
  section: string;
  blocks: PlanningBlock[];
};

type SelectedBlock = {
  id: string;
  section: string;
  timeWindow: string;
  duration: string;
  tasksScheduled: number;
  trainImpact: ImpactLevel;
  priorityCoverage: "High" | "Medium" | "Low";
  reason: string;
  blockStatus: string;
};

type ConstraintStatus = {
  name: string;
  state: "OK" | "Warning" | "Conflict";
  value: string;
};

type PendingTask = {
  taskId: string;
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  priority: PriorityLevel;
  reason: string;
};

type PlannerTrain = {
  train_key: string;
  station_id: string;
  stop_order: number;
  scheduled_departure: string;
  predicted_delay_min: number;
};

export type BlockPlannerResponse = {
  planningDate: string;
  summary: PlanningSummary[];
  rows: GanttRow[];
  selectedBlock: SelectedBlock | null;
  constraints: ConstraintStatus[];
  pendingTasks: PendingTask[];
  trains: PlannerTrain[];
};

function hoursSinceMidnight(value: Date, planningDate: string): number {
  const dayStart = new Date(`${planningDate}T00:00:00`).getTime();
  return (value.getTime() - dayStart) / 3_600_000;
}

function toPlanningBlock(
  window: WindowSummary,
  rowId: string,
  sectionLabel: string,
  planningDate: string,
): PlanningBlock {
  const impact = window.available ? window.impact : "Unavailable";
  return {
    id: window.windowId,
    rowId,
    section: sectionLabel,
    startHour: Math.max(0, hoursSinceMidnight(window.start, planningDate)),
    // The Gantt shows one day; windows running past midnight are clipped.
    endHour: Math.min(24, hoursSinceMidnight(window.end, planningDate)),
    impact,
    status: impact === "Unavailable" ? "Unavailable" : `${impact} Impact`,
    blockId: window.blockId,
    blockType: window.blockType,
    blockStatus: window.status,
    startLabel: formatClock(window.start),
    endLabel: formatClock(window.end),
    duration: formatDuration(window.durationMin),
    candidateTasks: window.candidateTaskIds.length,
    overlappingTrains: window.overlappingTrains,
    trainImpact: window.impact,
    priorityCoverage: toPriorityCoverage(window.topCandidateScore),
    reason: describeWindowReason(window),
  };
}

async function getTrainsForDate(planningDate: string): Promise<PlannerTrain[]> {
  const result = await pool.query<{
    train_id: string;
    section_id: string;
    entry_clock: string;
    stop_order: number;
  }>(
    `SELECT train_id,
            section_id,
            to_char(entry_time, 'HH24:MI:SS') AS entry_clock,
            ROW_NUMBER() OVER (PARTITION BY train_id ORDER BY entry_time, movement_id)::int
              AS stop_order
     FROM railopt.train_movements
     WHERE entry_time >= $1::date
       AND entry_time < $1::date + 1
     ORDER BY entry_time, movement_id`,
    [planningDate],
  );

  return result.rows.map((row) => ({
    train_key: row.train_id,
    station_id: row.section_id,
    stop_order: row.stop_order,
    scheduled_departure: row.entry_clock,
    predicted_delay_min: 0,
  }));
}

async function getConstraintCounts(): Promise<{
  resourcesAvailable: number;
  resourcesTotal: number;
  restrictedBlocks: number;
  mandatoryDependencies: number;
}> {
  const result = await pool.query<{
    resources_available: string;
    resources_total: string;
    restricted_blocks: string;
    mandatory_dependencies: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM railopt.resources WHERE status = 'AVAILABLE') AS resources_available,
       (SELECT COUNT(*) FROM railopt.resources) AS resources_total,
       (SELECT COUNT(*) FROM railopt.blocks WHERE status = 'RESTRICTED') AS restricted_blocks,
       (SELECT COUNT(*) FROM railopt.dependencies d
          JOIN railopt.maintenance_tasks p ON p.task_id = d.predecessor_task_id
          JOIN railopt.maintenance_tasks s ON s.task_id = d.successor_task_id
         WHERE d.mandatory
           AND p.status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS')
           AND s.status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS')) AS mandatory_dependencies`,
  );
  const row = result.rows[0];
  return {
    resourcesAvailable: Number(row.resources_available),
    resourcesTotal: Number(row.resources_total),
    restrictedBlocks: Number(row.restricted_blocks),
    mandatoryDependencies: Number(row.mandatory_dependencies),
  };
}

export async function getBlockPlannerData(): Promise<BlockPlannerResponse> {
  const planningDate = await getPlanningDate();
  const tasks = await getActiveTasks(planningDate);
  const [sections, windows, trains, counts] = await Promise.all([
    getSections(),
    getWindowsForDate(planningDate, tasks),
    getTrainsForDate(planningDate),
    getConstraintCounts(),
  ]);

  const sectionLabels = new Map(
    sections.map((section) => [section.sectionId, section.label]),
  );

  const rows: GanttRow[] = sections.map((section, index) => {
    const rowId = `row-${index + 1}`;
    const fullLabel = `${section.label} (${section.sectionId})`;
    return {
      id: rowId,
      label: section.label,
      section: section.sectionId,
      blocks: windows
        .filter((window) => window.sectionId === section.sectionId)
        .map((window) => toPlanningBlock(window, rowId, fullLabel, planningDate)),
    };
  });

  const topWindow = pickTopCandidateWindow(windows);
  const selectedBlock: SelectedBlock | null = topWindow
    ? {
        id: topWindow.windowId,
        section: `${sectionLabels.get(topWindow.sectionId) ?? topWindow.sectionId} (${topWindow.sectionId})`,
        timeWindow: `${formatClock(topWindow.start)} – ${formatClock(topWindow.end)}`,
        duration: formatDuration(topWindow.durationMin),
        tasksScheduled: topWindow.candidateTaskIds.length,
        trainImpact: topWindow.impact,
        priorityCoverage: toPriorityCoverage(topWindow.topCandidateScore),
        reason: describeWindowReason(topWindow),
        blockStatus: topWindow.status,
      }
    : null;

  const availableWindows = windows.filter((window) => window.available);
  const unavailableWindows = windows.length - availableWindows.length;
  const trainOverlaps = availableWindows.reduce(
    (sum, window) => sum + window.overlappingTrains,
    0,
  );
  const highImpactWindows = availableWindows.filter(
    (window) => window.impact === "High",
  ).length;
  const candidateTaskIds = new Set(
    availableWindows.flatMap((window) => window.candidateTaskIds),
  );
  const overdueTasks = tasks.filter((task) => task.overdueDays > 0).length;

  const pendingTasks = tasks
    .filter((task) => task.status === "PENDING")
    .slice(0, MAX_PENDING_TASKS)
    .map((task) => ({
      taskId: task.taskId,
      assetId: task.assetId,
      task: describeTask(task),
      department: task.department,
      section: task.sectionId,
      riskScore: task.priorityScore,
      priority: toPriorityLevel(task.priorityScore),
      reason:
        task.overdueDays > 0
          ? `Overdue by ${task.overdueDays} day(s); awaiting block assignment`
          : candidateTaskIds.has(task.taskId)
            ? "Has a candidate window today; awaiting block assignment"
            : "No candidate window on this planning date",
    }));

  return {
    planningDate,
    summary: [
      {
        label: "Planning Date",
        value: formatDateLabel(planningDate),
        tone: "default",
      },
      {
        label: "Sections",
        value: String(sections.length),
        subtext: `${new Set(windows.map((window) => window.sectionId)).size} with windows today`,
        tone: "default",
      },
      {
        label: "Block Windows",
        value: String(availableWindows.length),
        subtext: `available of ${windows.length}`,
        tone: "default",
      },
      {
        label: "Candidate Tasks",
        value: String(candidateTaskIds.size),
        subtext: `of ${tasks.length} active`,
        tone: "default",
      },
      {
        label: "Train Overlaps",
        value: String(trainOverlaps),
        subtext: `${highImpactWindows} high-impact window(s)`,
        tone: highImpactWindows ? "warning" : "success",
      },
    ],
    rows,
    selectedBlock,
    constraints: [
      {
        name: "Window Availability",
        state: unavailableWindows ? "Warning" : "OK",
        value: `${availableWindows.length}/${windows.length} available`,
      },
      {
        name: "Train Movements in Windows",
        state: trainOverlaps ? "Warning" : "OK",
        value: `${trainOverlaps} overlaps`,
      },
      {
        name: "Resource Availability",
        state:
          counts.resourcesAvailable < counts.resourcesTotal ? "Warning" : "OK",
        value: `${counts.resourcesAvailable}/${counts.resourcesTotal} available`,
      },
      {
        name: "Mandatory Dependencies",
        state: counts.mandatoryDependencies ? "Warning" : "OK",
        value: `${counts.mandatoryDependencies} active`,
      },
      {
        name: "Restricted Blocks",
        state: counts.restrictedBlocks ? "Warning" : "OK",
        value: `${counts.restrictedBlocks} need approval`,
      },
      {
        name: "Overdue Tasks",
        state: overdueTasks ? "Conflict" : "OK",
        value: `${overdueTasks} overdue`,
      },
    ],
    pendingTasks,
    trains,
  };
}
