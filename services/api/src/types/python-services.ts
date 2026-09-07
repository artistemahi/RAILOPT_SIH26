export interface MlPredictionInput {
  prev_delay_departure_min: number;
  is_prev_departure_delay_imputed: number;
  station_id: string;
  stop_order: number;
  segment_id: string;
  category_code: string;
  distance_from_start_km: number;
  min_technical_time_min: number;
  time_reserve_min: number;
  occupancy_level: number;
  arrival_hour_sin: number;
  arrival_hour_cos: number;
  departure_hour_sin: number;
  departure_hour_cos: number;
  edge_active_difficulty_p90: number;
  is_track_closure: number;
  track_closure_length: number;
  is_speed_warning: number;
  speed_warning_length: number;
  station_scheduled_dwell_time_P50: number;
  station_scheduled_dwell_time_MAD: number;
  station_scheduled_dwell_time_P90: number;
  station_delta_stop_min_P50: number;
  station_delta_stop_min_MAD: number;
  station_delta_stop_min_P90: number;
  edge_delta_edge_min_P50: number;
  edge_delta_edge_min_MAD: number;
  edge_delta_edge_min_P90: number;
  edge_delta_delay_P50: number;
  edge_delta_delay_P90: number;
  edge_delta_delay_MAD: number;
  temperature_2m: number;
  snow_depth: number;
  is_heavy_precipitation: number;
  passenger_volume_rank: number;
  num_platforms: number;
  num_platform_tracks: number;
  intersecting_lines_count: number;
  is_node: number;
  is_passing_loop: number;
  node_historical_hazard_intensity: number;
  edge_historical_hazard_intensity: number;
}

export interface MlPredictionResponse {
  predicted_delay: number;
}

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
  schedule: Array<TrainScheduleInput & { cp_sat_departure_minutes: number }>;
  metadata: Record<string, number>;
}
