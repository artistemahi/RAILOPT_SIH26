export type PriorityLevel = "P1" | "P2" | "P3";
export type RiskStatus = "Attention Required" | "Monitor" | "Normal";

export interface RiskTask {
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  priority: PriorityLevel;
  overdueDays: number;
  status: RiskStatus;
  riskProbability: number;
  criticality: number;
  condition: string;
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
  color: string;
}

export interface RiskDetails {
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskProbability: number;
  priority: PriorityLevel;
  criticality: number;
  overdueDays: number;
  condition: string;
  factors: RiskFactor[];
  recommendation: string;
  riskLevel: string;
  urgency: string;
  operationalImpact: string;
  planningImplication: string;
}
