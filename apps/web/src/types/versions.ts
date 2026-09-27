import type { BlockPlan } from "./planner";
import type { WhatIfChange, WhatIfSlot } from "./whatIf";

export type PlanStatus = "DRAFT" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export type PlanTrigger = "PLAN" | "MODIFY" | "REPLAN";
export type PlanType = "WEEKLY" | "MONTHLY";

export interface PlanVersionSummary {
  runId: string;
  version: number;
  parentRunId: string | null;
  triggerType: PlanTrigger;
  planType: PlanType;
  triggerDetail: {
    changes?: WhatIfChange[];
    pins?: Record<string, string>;
    newChanges?: WhatIfChange[];
    newPins?: Record<string, string>;
    freezeBefore?: string | null;
  } | null;
  planningDate: string;
  horizonDays: number;
  solverStatus: string;
  validationPassed: boolean;
  kpis: BlockPlan["kpis"];
  status: PlanStatus;
  decidedBy: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ReplanDetails {
  changes: string[];
  freeze_before: string | null;
  frozen: Array<{ task_id: string; priority_score: number; to: WhatIfSlot }>;
  frozen_conflicts: string[];
  unmet_pins: string[];
  diff: {
    moved: Array<{ task_id: string; priority_score: number; from: WhatIfSlot; to: WhatIfSlot }>;
    added: Array<{ task_id: string; priority_score: number; to: WhatIfSlot }>;
    removed: Array<{
      task_id: string;
      priority_score: number;
      from: WhatIfSlot;
      reason_code: string;
      reason: string;
    }>;
    unchanged: number;
  };
}

export type VersionPlan = BlockPlan & { replan?: ReplanDetails };

export interface PlanVersion extends PlanVersionSummary {
  plan: VersionPlan;
}

export interface PlanEvent {
  eventId: number;
  runId: string;
  eventType: string;
  actor: string;
  reason: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface MonthlyPlan {
  planning_date: string;
  weeks: number;
  horizon_days: number;
  priority: BlockPlan["priority"];
  solver: { status: string; wall_time_seconds: number; variables: number; constraints: number };
  validation: BlockPlan["validation"];
  kpis: {
    tasks_considered: number;
    tasks_with_candidates: number;
    tasks_scheduled: number;
    priority_weighted_completion_pct: number;
    p1_total: number;
    p1_scheduled: number;
    overdue_at_start: number;
    overdue_planned: number;
    planned_late: number;
  };
  week_summary: Array<{
    week: number;
    start: string;
    end: string;
    projected: boolean;
    tasks: number;
    by_department: Record<string, number>;
    minutes_used: number;
    capacity_minutes: number;
    sections: Record<string, { used: number; capacity: number }>;
  }>;
  assignments: Array<{
    task_id: string;
    week: number;
    window_id: string;
    section_id: string;
    department: string;
    priority_score: number;
    due_date: string | null;
    weeks_late: number;
    overdue_at_start: boolean;
  }>;
  unplanned: Array<{
    task_id: string;
    priority_score: number;
    section_id: string;
    department: string;
    due_date: string | null;
    reason_code: string;
    reason: string;
  }>;
  block_requests: Array<{
    section_id: string;
    tasks: string[];
    departments: string[];
    task_count: number;
    needed_minutes: number;
    longest_train_free_gap_minutes: number;
  }>;
  assumptions: string[];
}

export interface MonthlyVersion extends PlanVersionSummary {
  plan: MonthlyPlan;
}
