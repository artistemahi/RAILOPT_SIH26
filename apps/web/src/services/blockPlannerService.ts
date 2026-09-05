import {
  constraintData,
  ganttRows,
  pendingTasksData,
  planningSummaryData,
  selectedBlockData,
  type ConstraintStatus,
  type GanttRow,
  type PendingTask,
  type PlanningSummary,
  type SelectedBlock,
} from "./mock/blockPlannerData";

export async function getBlockPlannerData(): Promise<{
  summary: PlanningSummary[];
  rows: GanttRow[];
  selectedBlock: SelectedBlock;
  constraints: ConstraintStatus[];
  pendingTasks: PendingTask[];
}> {
  return {
    summary: planningSummaryData,
    rows: ganttRows,
    selectedBlock: selectedBlockData,
    constraints: constraintData,
    pendingTasks: pendingTasksData,
  };
}
