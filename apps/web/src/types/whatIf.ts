import type { BlockPlan, BlockPlanKpis } from "./planner";

export type WhatIfChangeType =
  | "WINDOW_UNAVAILABLE"
  | "WINDOW_SHORTEN"
  | "RESOURCE_UNAVAILABLE"
  | "TASK_DURATION"
  | "TASK_PRIORITY"
  | "TASK_REMOVE"
  | "TRAIN_ADD";

export interface WhatIfChange {
  type: WhatIfChangeType;
  window_id?: string;
  resource_id?: string;
  task_id?: string;
  section_id?: string;
  minutes?: number;
  priority_score?: number;
  start_time?: string;
  end_time?: string;
}

export interface WhatIfOptions {
  planning_date: string;
  horizon_days: number;
  windows: Array<{
    window_id: string;
    block_type: string;
    sections: string[];
    start_time: string;
    end_time: string;
    available: boolean;
  }>;
  resources: Array<{
    resource_id: string;
    department: string;
    skills: string;
    status: string;
  }>;
  tasks: Array<{
    task_id: string;
    section_id: string;
    department: string;
    priority_score: number;
  }>;
  sections: string[];
}

export interface WhatIfSlot {
  window_id: string;
  section_id: string;
  start: string;
  end: string;
}

type PlanSummary = Pick<BlockPlan, "solver" | "validation"> & { kpis: BlockPlanKpis };

export interface WhatIfResult {
  changes: string[];
  baseline: PlanSummary;
  scenario: PlanSummary;
  diff: {
    added: Array<{ task_id: string; priority_score: number; to: WhatIfSlot }>;
    removed: Array<{
      task_id: string;
      priority_score: number;
      from: WhatIfSlot;
      reason_code: string;
      reason: string;
    }>;
    moved: Array<{ task_id: string; priority_score: number; from: WhatIfSlot; to: WhatIfSlot }>;
    unchanged: number;
  };
}
