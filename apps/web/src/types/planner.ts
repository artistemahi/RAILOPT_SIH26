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

// CP-SAT block plan (POST /api/planner/plan-blocks)

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

export interface BlockPlan {
  planning_date: string;
  horizon_days: number;
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
