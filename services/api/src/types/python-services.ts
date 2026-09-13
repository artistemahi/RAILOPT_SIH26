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
export interface BlockPlanOptimizeRequest {
  tables: Record<string, Array<Record<string, unknown>>>;
  time_limit_seconds?: number;
  workers?: number;
}

export interface BlockPlanOptimizeResponse {
  solver_status: string;
  objective_value: number;
  schedule: Array<{
    task_id: string;
    scheduled: boolean;
    window_id: string | null;
    block_id: string | null;
    start_time: string | null;
    end_time: string | null;
    planning_priority: number;
    status: string | null;
  }>;
  metrics: Record<string, number>;
  validation: {
    valid: boolean;
    violation_count: number;
    violations: Array<Record<string, unknown>>;
  };
  compatibility_analysis: Array<Record<string, unknown>>;
  conflict_edges: Array<Record<string, unknown>>;
}
