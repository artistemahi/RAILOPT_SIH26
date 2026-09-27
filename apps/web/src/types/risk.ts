export type PriorityLevel = "P1" | "P2" | "P3";
export type RiskStatus = "Attention Required" | "Monitor" | "Normal";

export interface RiskTask {
  taskId: string;
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  scoreSource: "OVERRIDE" | "ML" | "DATASET";
  overrideReason: string | null;
  priority: PriorityLevel;
  overdueDays: number;
  status: RiskStatus;
  taskStatus: string;
  riskProbability: number;
  criticality: number;
  urgencyScore: number;
  condition: string;
  conditionScore: number | null;
  defectHistory: number;
  operationalImpact: number;
  urgency: "Critical" | "High" | "Medium";
}

export interface RiskSummary {
  label: string;
  value: number;
  supportText: string;
  tone: "danger" | "warning" | "success" | "default";
}

export interface RiskFactor {
  label: string;
  value: number;
  display: string;
  color: string;
}

export interface RiskDetails {
  taskId: string;
  assetId: string;
  task: string;
  department: string;
  section: string;
  priorityScore: number;
  scoreSource: "OVERRIDE" | "ML" | "DATASET";
  overrideReason: string | null;
  priority: PriorityLevel;
  taskStatus: string;
  overdueDays: number;
  condition: string;
  factors: RiskFactor[];
  riskLevel: string;
  urgency: string;
}
