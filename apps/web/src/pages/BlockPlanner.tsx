import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { Sidebar } from "../components/dashboard/Sidebar";
import { ConstraintsSummary } from "../components/planner/ConstraintsSummary";
import { GanttChart } from "../components/planner/GanttChart";
import { ImpactLegend } from "../components/planner/ImpactLegend";
import { PendingTasksTable } from "../components/planner/PendingTasksTable";
import { PlannerSummaryCards } from "../components/planner/PlannerSummaryCards";
import { PlanningControls } from "../components/planner/PlanningControls";
import { SelectedBlockDetails } from "../components/planner/SelectedBlockDetails";
import { getBlockPlannerData } from "../services/blockPlannerService";
import type {
  ConstraintStatus,
  GanttRow,
  PendingTask,
  PlanningSummary,
  SelectedBlock,
} from "../services/mock/blockPlannerData";

export default function BlockPlannerPage() {
  const [data, setData] = useState<{
    summary: PlanningSummary[];
    rows: GanttRow[];
    selectedBlock: SelectedBlock;
    constraints: ConstraintStatus[];
    pendingTasks: PendingTask[];
  } | null>(null);
  const [selectedId, setSelectedId] = useState("B104");

  useEffect(() => {
    void getBlockPlannerData().then(setData);
  }, []);

  const selectedBlock = useMemo(() => {
    if (!data) return null;
    const match = data.rows
      .flatMap((row) => row.blocks)
      .find((block) => block.id === selectedId);

    if (!match) {
      return data.selectedBlock;
    }

    const trainImpact: SelectedBlock["trainImpact"] =
      match.impact === "High"
        ? "High"
        : match.impact === "Medium"
          ? "Medium"
          : "Low";

    const priorityCoverage: SelectedBlock["priorityCoverage"] =
      match.impact === "High"
        ? "High"
        : match.impact === "Medium"
          ? "Medium"
          : "Low";

    return {
      id: match.id,
      section: match.section,
      timeWindow: `${match.startLabel} – ${match.endLabel}`,
      duration: match.duration,
      tasksScheduled: 3,
      trainImpact,
      priorityCoverage,
      reason:
        match.impact === "High"
          ? "High risk tasks and track geometry constraints"
          : "Operational constraints in the selected window",
    } satisfies SelectedBlock;
  }, [data, selectedId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading planner data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="ml-52 min-h-screen bg-slate-100">
        <DashboardHeader
          title="Block Planner"
          subtitle="Create and optimize maintenance blocks with operational constraints."
        />

        <main className="space-y-4 p-4">
          <PlannerSummaryCards summary={data.summary} />

          <PlanningControls />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_0.9fr]">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <GanttChart
                  rows={data.rows}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold text-slate-800">
                    Legend
                  </div>
                  <ImpactLegend />
                </div>
              </div>
            </div>

            <div>
              {selectedBlock ? (
                <SelectedBlockDetails block={selectedBlock} />
              ) : null}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_0.9fr]">
            <PendingTasksTable tasks={data.pendingTasks} />
            <ConstraintsSummary constraints={data.constraints} />
          </section>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            Block schedules are optimized based on risk priority and operational
            constraints. Final approval is required before operational
            implementation.
          </div>
        </main>
      </div>
    </div>
  );
}
