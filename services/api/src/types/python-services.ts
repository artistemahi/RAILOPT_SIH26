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