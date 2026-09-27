import type { PriorityLevel } from "./dashboard";

export interface BacklogTask {
  taskId: string;
  assetId: string;
  task: string;
  taskType: string;
  department: string;
  sectionId: string;
  status: string;
  dueDate: string | null;
  overdueDays: number;
  priorityScore: number;
  priority: PriorityLevel;
  scoreSource: "OVERRIDE" | "ML" | "DATASET";
  overrideReason: string | null;
  openDefects: number;
}

export interface Backlog {
  planningDate: string;
  statusCounts: Record<string, number>;
  tasks: BacklogTask[];
}

export interface BlockWindow {
  windowId: string;
  blockId: string;
  blockType: string;
  sectionId: string;
  sections: string[];
  start: string;
  end: string;
  durationMin: number;
  available: boolean;
  status: string;
  overlappingTrains: number;
  overlappingFreight: number;
  impact: "Low" | "Medium" | "High";
  pendingTasks: number;
}

export interface BlockWindows {
  planningDate: string;
  horizonDays: number;
  windows: BlockWindow[];
}

export interface DataSources {
  datasetRoot: string;
  sources: Array<{
    file: string;
    table: string;
    csvRows: number | null;
    tableRows: number;
    inSync: boolean;
  }>;
  priorityPredictions: { runs: number; rows: number; latest: string | null };
}

export interface DataQuality {
  planningDate: string;
  checks: Array<{
    id: string;
    category: string;
    description: string;
    failing: number;
    status: "PASS" | "WARN" | "FAIL";
  }>;
}

export interface Settings {
  planningDate: string;
  planningDateSource: string;
  horizonDays: number;
  priorityBands: Record<string, string>;
  trainImpactBands: Record<string, string>;
  solver: { engine: string; timeLimitSeconds: number; whatIfMode: string };
  services: Array<{ name: string; url: string; up: boolean }>;
  model: Record<string, unknown> | null;
}
