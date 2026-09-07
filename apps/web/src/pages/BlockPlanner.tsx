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
import {
  getBlockPlannerData,
  optimizePlanner,
  type PlannerTrain,
  type OptimizeResult,
} from "../services/blockPlannerService";
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
    trains: PlannerTrain[];
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("B104");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizeResult | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void getBlockPlannerData()
      .then(setData)
      .catch(() => {
        setLoadError(
          "Planner data is unavailable. Check the API connection and retry.",
        );
      });
  }, []);

  async function handleOptimize() {
    if (!data?.trains.length || isOptimizing) {
      setOptimizationError("No train scheduling data is available");
      return;
    }

    setIsOptimizing(true);
    setOptimizationError(null);
    try {
      setOptimization(await optimizePlanner(data.trains));
    } catch (error) {
      console.error("Unable to optimize planner schedule:", error);
      setOptimizationError("Optimization failed. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  }

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

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center text-slate-600">
        <div className="rounded-xl border border-rose-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            Planner unavailable
          </p>
          <p className="mt-1 text-xs text-slate-500">{loadError}</p>
        </div>
      </div>
    );
  }

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

          <PlanningControls
            isOptimizing={isOptimizing}
            solverStatus={optimization?.solver_status ?? null}
            optimizedSchedule={optimization?.schedule ?? null}
            error={optimizationError}
            onOptimize={() => void handleOptimize()}
          />

          {optimization ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Optimized train sequence
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-950">
                    CP-SAT returned {optimization.schedule.length} scheduled
                    departures
                  </p>
                </div>
                <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {optimization.solver_status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-emerald-950 sm:grid-cols-4">
                {optimization.schedule.map((item) => (
                  <div
                    key={`${item.train_key}-${item.station_id}`}
                    className="rounded-md border border-emerald-200 bg-white px-2.5 py-2"
                  >
                    <div className="font-semibold">{item.train_key}</div>
                    <div className="mt-0.5 text-emerald-700">
                      {item.cp_sat_departure_minutes} min from midnight
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

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
              {selectedBlock?.id ? (
                <SelectedBlockDetails block={selectedBlock} />
              ) : null}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_0.9fr]">
            {data.pendingTasks.length ? (
              <PendingTasksTable tasks={data.pendingTasks} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                No pending maintenance tasks are available.
              </div>
            )}
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
