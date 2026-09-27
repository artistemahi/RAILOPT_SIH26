import type { BlockPlan } from "./planner";
import type { WhatIfChange, WhatIfSlot } from "./whatIf";

export type PlanStatus = "DRAFT" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export type PlanTrigger = "PLAN" | "MODIFY" | "REPLAN";

export interface PlanVersionSummary {
  runId: string;
  version: number;
  parentRunId: string | null;
  triggerType: PlanTrigger;
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
