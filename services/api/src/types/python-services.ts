export interface PriorityTaskInput {
  [key: string]: unknown;
}

export interface PriorityAssetInput {
  [key: string]: unknown;
}

export interface PriorityDefectInput {
  [key: string]: unknown;
}

export interface PriorityTrainInput {
  [key: string]: unknown;
}

export interface PriorityPredictionInput {
  tasks: PriorityTaskInput[];
  assets: PriorityAssetInput[];
  defects: PriorityDefectInput[];
  trains: PriorityTrainInput[];
}

export interface PriorityPredictionResult {
  task_id: string | null;
  asset_id: string | null;
  calculated_priority_score: number;
  predicted_priority_score: number;
  final_priority_score: number;
}

export interface PriorityPredictionResponse {
  success: boolean;
  count: number;
  results: PriorityPredictionResult[];
}


// ---------------------------------------------------------
// Optimizer types — keep these for Tushar's optimizer
// ---------------------------------------------------------

export interface TrainScheduleInput {
  train_key: string;
  station_id: string;
  stop_order: number;
  scheduled_departure: string;
  predicted_delay_min: number;
}

export interface OptimizeRequest {
  trains: TrainScheduleInput[];
  min_headway_min?: number;
  max_shift_min?: number;
}

export interface OptimizeResponse {
  solver_status: string;
  schedule: Array<
    TrainScheduleInput & {
      cp_sat_departure_minutes: number;
    }
  >;
  metadata: Record<string, number>;
}
// ---------------------------------------------------------
// CP-SAT block planner (optimizer POST /plan-blocks)
// ---------------------------------------------------------

export interface BlockPlanAssignment {
  task_id: string;
  window_id: string;
  block_id: string;
  section_id: string;
  department: string;
  priority_score: number;
  start: string;
  end: string;
  start_minute: number;
  end_minute: number;
}

export interface BlockPlanUnscheduled {
  task_id: string;
  priority_score: number;
  reason_code: string;
  reason: string;
  example: string | null;
}

export interface BlockPlanResponse {
  solver: {
    status: string;
    wall_time_seconds: number;
    objective: number | null;
    variables: number;
    constraints: number;
  };
  validation: {
    passed: boolean;
    checks: string[];
    violations: Array<{ check: string; task_id: string; message: string }>;
  };
  kpis: {
    tasks_considered: number;
    tasks_with_candidates: number;
    tasks_scheduled: number;
    p1_total: number;
    p1_scheduled: number;
    priority_weighted_completion_pct: number;
    block_utilization_pct: number;
    used_section_minutes: number;
    available_section_minutes: number;
    candidate_pairs: number;
    rejected_pairs: number;
  };
  assignments: BlockPlanAssignment[];
  unscheduled: BlockPlanUnscheduled[];
  rejection_summary: Record<string, number>;
}
