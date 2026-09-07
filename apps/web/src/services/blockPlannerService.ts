import type {
  ConstraintStatus,
  GanttRow,
  PendingTask,
  PlanningSummary,
  SelectedBlock,
} from "./mock/blockPlannerData";

export interface PlannerTrain {
  train_key: string;
  station_id: string;
  stop_order: number;
  scheduled_departure: string;
  predicted_delay_min: number;
}

export interface OptimizeResult {
  solver_status: string;
  schedule: Array<PlannerTrain & { cp_sat_departure_minutes: number }>;
  metadata: Record<string, number>;
}

interface PlannerData {
  summary: PlanningSummary[];
  rows: GanttRow[];
  selectedBlock: SelectedBlock;
  constraints: ConstraintStatus[];
  pendingTasks: PendingTask[];
  trains: PlannerTrain[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

function isPlannerData(value: unknown): value is PlannerData {
  if (typeof value !== "object" || value === null) return false;

  const planner = value as Partial<PlannerData>;
  return (
    Array.isArray(planner.summary) &&
    Array.isArray(planner.rows) &&
    typeof planner.selectedBlock === "object" &&
    planner.selectedBlock !== null &&
    Array.isArray(planner.constraints) &&
    Array.isArray(planner.pendingTasks)
  );
}

export async function getBlockPlannerData(): Promise<PlannerData> {
  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/planner`,
    );

    if (!response.ok) {
      throw new Error(`Planner API returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isPlannerData(payload)) {
      throw new Error("Planner API returned an invalid response");
    }

    return {
      summary: payload.summary.map((item) => ({ ...item })),
      rows: payload.rows.map((row) => ({
        ...row,
        blocks: row.blocks.map((block) => ({ ...block })),
      })),
      selectedBlock: { ...payload.selectedBlock },
      constraints: payload.constraints.map((constraint) => ({ ...constraint })),
      pendingTasks: payload.pendingTasks.map((task) => ({ ...task })),
      trains: payload.trains.map((train) => ({ ...train })),
    };
  } catch (error) {
    console.error("Unable to load planner data from the Node API:", error);
    throw new Error("Planner data is unavailable");
  }
}

export async function optimizePlanner(
  trains: PlannerTrain[],
): Promise<OptimizeResult> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/api/optimize`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trains }),
    },
  );

  if (!response.ok) {
    throw new Error(`Optimizer API returned HTTP ${response.status}`);
  }

  return (await response.json()) as OptimizeResult;
}
