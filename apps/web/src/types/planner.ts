export type ImpactLevel = "Low" | "Medium" | "High";
export type CoverageLevel = "High" | "Medium" | "Low";

export interface PlanningSummary {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

export interface PlanningBlock {
  id: string;
  rowId: string;
  section: string;
  startHour: number;
  endHour: number;
  impact: ImpactLevel | "Unavailable";
  status: "Low Impact" | "Medium Impact" | "High Impact" | "Unavailable";
  blockId: string;
  blockType: string;
  blockStatus: string;
  startLabel: string;
  endLabel: string;
  duration: string;
  candidateTasks: number;
  overlappingTrains: number;
  trainImpact: ImpactLevel;
  priorityCoverage: CoverageLevel;
  reason: string;
}

export interface GanttRow {
  id: string;
  label: string;
  section: string;
  blocks: PlanningBlock[];
}

export interface SelectedBlock {
  id: string;
  section: string;
  timeWindow: string;
  duration: string;
  tasksScheduled: number;
  trainImpact: ImpactLevel;
  priorityCoverage: CoverageLevel;
  reason: string;
  blockStatus: string;
}

export interface ConstraintStatus {
  name: string;
  state: "OK" | "Warning" | "Conflict";
  value: string;
}

export interface PendingTask {
  taskId: string;
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  priority: "P1" | "P2" | "P3";
  reason: string;
}
