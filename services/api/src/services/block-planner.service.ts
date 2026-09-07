import { pool } from "../config/database.js";

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
  impact: "Low" | "Medium" | "High" | "Approved";
  status: "Low Impact" | "Medium Impact" | "High Impact" | "Approved";
  blockStatus: string;
  solverStatus: string | null;
  startLabel: string;
  endLabel: string;
  duration: string;
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
  trainImpact: "High" | "Medium" | "Low";
  priorityCoverage: "High" | "Medium" | "Low";
  reason: string;
  blockStatus: string;
  solverStatus: string | null;
};

type ConstraintStatus = {
  name: string;
  state: "OK" | "Warning" | "Conflict";
  value: string;
};

type PendingTask = {
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  priority: "P1" | "P2" | "P3";
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
  summary: PlanningSummary[];
  rows: GanttRow[];
  selectedBlock: SelectedBlock;
  constraints: ConstraintStatus[];
  pendingTasks: PendingTask[];
  trains: PlannerTrain[];
};

type BlockRow = {
  id: string;
  section: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  train_impact: "Low" | "Medium" | "High";
  priority_coverage: "High" | "Medium" | "Low";
  status: string;
  solver_status: string | null;
};

type TaskRow = {
  asset_id: string;
  task: string;
  department: string;
  section: string;
  risk_score: number;
  priority: "P1" | "P2" | "P3";
  status: string;
};

type ImpactRow = {
  block_id: string;
  predicted_delay_min: number;
  impact_level: "Low" | "Medium" | "High";
};

type TrainRow = {
  id: string;
  section: string | null;
  scheduled_departure: string | null;
};

const sectionLabels: Record<string, string> = {
  SEC01: "NDLS – ALD",
  SEC02: "ALD – CNB",
  SEC03: "CNB – KANPUR",
  SEC04: "KANPUR – LKO",
};

const sectionRowIds: Record<string, string> = {
  SEC01: "row-1",
  SEC02: "row-2",
  SEC03: "row-3",
  SEC04: "row-4",
};

function parseHour(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours + minutes / 60;
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} Hrs`;
}

function getImpactStatus(
  impact: BlockRow["train_impact"],
): PlanningBlock["status"] {
  return impact === "High"
    ? "High Impact"
    : impact === "Medium"
      ? "Medium Impact"
      : "Low Impact";
}

function getReason(block: BlockRow): string {
  if (block.id === "B104")
    return "High risk tasks and track geometry constraints";
  return "Operational constraints in the selected window";
}

export async function getBlockPlannerData(): Promise<BlockPlannerResponse> {
  const [blocksResult, tasksResult, impactsResult, trainsResult] =
    await Promise.all([
      pool.query<BlockRow>(
        `SELECT id, section, start_time, end_time, duration_min, train_impact,
              priority_coverage, status, solver_status
       FROM maintenance_blocks
       ORDER BY section, start_time, id`,
      ),
      pool.query<TaskRow>(
        `SELECT mt.asset_id, mt.task, mt.department, a.section, mt.risk_score,
              mt.priority, mt.status
       FROM maintenance_tasks mt
       INNER JOIN assets a ON a.id = mt.asset_id
       WHERE mt.status = 'Pending'
       ORDER BY mt.risk_score DESC, mt.id`,
      ),
      pool.query<ImpactRow>(
        `SELECT block_id, predicted_delay_min, impact_level
       FROM train_impacts
       ORDER BY block_id, id`,
      ),
      pool.query<TrainRow>(
        `SELECT id, section, scheduled_departure
       FROM trains
       ORDER BY scheduled_departure, id`,
      ),
    ]);

  const blocks = blocksResult.rows;
  const tasks = tasksResult.rows;
  const impacts = impactsResult.rows;
  const trains = trainsResult.rows;
  const firstBlock = blocks[0];

  if (!firstBlock) {
    throw new Error("No maintenance blocks are available for planning");
  }

  const rows = Object.entries(sectionLabels).map(([section, label]) => ({
    id: sectionRowIds[section],
    label,
    section,
    blocks: blocks
      .filter((block) => block.section === section)
      .map((block) => ({
        id: block.id,
        rowId: sectionRowIds[section],
        section: `${label} (${section})`,
        startHour: parseHour(block.start_time),
        endHour: parseHour(block.end_time),
        impact: block.train_impact,
        status: getImpactStatus(block.train_impact),
        blockStatus: block.status,
        solverStatus: block.solver_status,
        startLabel: formatTime(block.start_time),
        endLabel: formatTime(block.end_time),
        duration: formatDuration(Number(block.duration_min)),
      })),
  }));

  const selectedBlock = {
    id: firstBlock.id,
    section: `${sectionLabels[firstBlock.section] ?? firstBlock.section} (${firstBlock.section})`,
    timeWindow: `${formatTime(firstBlock.start_time)} – ${formatTime(firstBlock.end_time)}`,
    duration: formatDuration(Number(firstBlock.duration_min)),
    tasksScheduled: tasks.filter((task) => task.risk_score >= 70).length,
    trainImpact: firstBlock.train_impact,
    priorityCoverage: firstBlock.priority_coverage,
    reason: getReason(firstBlock),
    blockStatus: firstBlock.status,
    solverStatus: firstBlock.solver_status,
  } satisfies SelectedBlock;

  const totalDelay = impacts.reduce(
    (sum, impact) => sum + Number(impact.predicted_delay_min),
    0,
  );
  const highestImpact = impacts.some((impact) => impact.impact_level === "High")
    ? "HIGH"
    : impacts.some((impact) => impact.impact_level === "Medium")
      ? "MEDIUM"
      : "LOW";

  return {
    summary: [
      {
        label: "Planning Date",
        value: "20 May 2025",
        tone: "default",
      },
      {
        label: "Corridor",
        value: "C1",
        subtext: "NDLS – LKO",
        tone: "default",
      },
      {
        label: "Blocks Planned",
        value: String(blocks.length),
        subtext: blocks.length
          ? `${formatTime(firstBlock.start_time)} – ${formatTime(blocks[blocks.length - 1].end_time)}`
          : undefined,
        tone: "default",
      },
      {
        label: "Tasks Scheduled",
        value: String(selectedBlock.tasksScheduled),
        subtext: `of ${tasks.length}`,
        tone: "default",
      },
      {
        label: "Train Impact",
        value: highestImpact,
        subtext: `${totalDelay} min predicted delay`,
        tone: highestImpact === "LOW" ? "success" : "warning",
      },
    ],
    rows,
    selectedBlock,
    constraints: [
      { name: "Track Availability", state: "OK", value: "OK" },
      {
        name: "Train Path Constraints",
        state: impacts.length ? "Warning" : "OK",
        value: impacts.length ? `${impacts.length} Impacts` : "OK",
      },
      { name: "Crew Availability", state: "Warning", value: "Not tracked" },
      { name: "Safety Buffer", state: "OK", value: "OK" },
      { name: "Block Length", state: "OK", value: "OK" },
      {
        name: "Simultaneous Blocks",
        state: blocks.length > 1 ? "Warning" : "OK",
        value: blocks.length > 1 ? `${blocks.length} Planned` : "OK",
      },
    ],
    pendingTasks: tasks.map((task) => ({
      assetId: task.asset_id,
      task: task.task,
      department: task.department,
      section: task.section,
      riskScore: Number(task.risk_score),
      priority: task.priority,
      reason: "Awaiting block assignment",
    })),
    trains: trains.map((train, index) => ({
      train_key: train.id,
      station_id: train.section ?? "C1",
      stop_order: index + 1,
      scheduled_departure: train.scheduled_departure ?? "00:00:00",
      predicted_delay_min: 0,
    })),
  };
}
