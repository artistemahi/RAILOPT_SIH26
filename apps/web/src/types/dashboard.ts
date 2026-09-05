export type PriorityLevel = "P1" | "P2" | "P3";
export type Severity = "CRITICAL" | "WARNING" | "INFO";
export type CorridorState = "Normal" | "Busy" | "Blocked" | "Selected";
export type TrainImpactCategory =
  | "Low Impact"
  | "Medium Impact"
  | "High Impact";

export interface AssetSummary {
  label: string;
  value: string;
  supportText?: string;
  tone: "default" | "danger" | "warning" | "success";
}

export interface MaintenanceTask {
  assetId: string;
  task: string;
  department: string;
  priority: PriorityLevel;
  riskScore: number;
  overdueDays: number;
}

export interface RecommendedBlock {
  blockId: string;
  corridor: string;
  timeWindow: string;
  durationHours: string;
  compatibleTasks: number;
  trainImpact: string;
  priorityCoverage: string;
}

export interface CorridorStatus {
  name: string;
  state: CorridorState;
}

export interface TrainImpact {
  name: TrainImpactCategory;
  value: number;
  color: string;
}

export interface AlertItem {
  severity: Severity;
  title: string;
  timestamp: string;
}

export interface DashboardData {
  assetSummary: AssetSummary[];
  maintenanceTasks: MaintenanceTask[];
  recommendedBlock: RecommendedBlock;
  corridorStatus: CorridorStatus[];
  trainImpact: TrainImpact[];
  alerts: AlertItem[];
}
