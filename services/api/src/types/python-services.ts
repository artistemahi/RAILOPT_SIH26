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
  model_version: string;
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

export type BlockPlanKpis = BlockPlanResponse["kpis"];

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
  coordination: {
    multi_department_pairs: number;
    windows_with_multi_department_work: number;
    sample: Array<{
      section_id: string;
      tasks: string[];
      departments: string[];
      window_id: string;
    }>;
  };
  compatibility: {
    edges_by_type: Record<string, number>;
    same_asset_groups: number;
    task_type_orders: number;
    dependency_cycles: string[][];
    deadline_conflicts: Array<{
      predecessor: string;
      successor: string;
      predecessor_due: string;
      successor_due: string;
    }>;
  };
  comparison?: {
    section_exclusive: BlockPlanKpis & { solver_status: string; validation_passed: boolean };
    coordinated: BlockPlanKpis & { solver_status: string; validation_passed: boolean };
  };
  assignments: BlockPlanAssignment[];
  unscheduled: BlockPlanUnscheduled[];
  rejection_summary: Record<string, number>;
  task_details?: Array<{
    task_id: string;
    section_id: string;
    department: string;
    task_type: string | null;
    asset_id: string | null;
    priority_score: number;
    candidate_windows: string[];
    rejections: Record<string, number>;
    rejection_examples: Array<{ window_id: string | null; code: string; message: string }>;
    scheduled_window: string | null;
  }>;
  compatibility_edges?: Array<{
    a: string;
    b: string;
    kind: string;
    rule: string;
    detail: string;
  }>;
}
