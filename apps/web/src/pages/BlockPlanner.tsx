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
  type OptimizeResult,
  type PlannerData,
} from "../services/blockPlannerService";
import type { SelectedBlock } from "../types/planner";

function toMinutes(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

function toClock(totalMinutes: number): string {
  const day = Math.floor(totalMinutes / 1440);
  const minutes = totalMinutes % 1440;
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return day ? `${clock} (+${day}d)` : clock;
}

export default function BlockPlannerPage() {
  const [data, setData] = useState<PlannerData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizeResult | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void getBlockPlannerData()
      .then((planner) => {
        setData(planner);
        setSelectedId(planner.selectedBlock?.id ?? null);
      })
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

  const shiftedDepartures = useMemo(() => {
    if (!optimization) return [];
    return optimization.schedule
      .map((item) => {
        const scheduledMinutes = toMinutes(item.scheduled_departure);
        return {
          ...item,
          scheduledMinutes,
          shift: item.cp_sat_departure_minutes - scheduledMinutes,
        };
      })
      .filter((item) => item.shift > 0)
      .sort((a, b) => b.shift - a.shift);
  }, [optimization]);

  const selectedBlock = useMemo(() => {
    if (!data) return null;
    const match = data.rows
      .flatMap((row) => row.blocks)
      .find((block) => block.id === selectedId);

    if (!match) {
      return data.selectedBlock;
    }

    return {
      id: match.id,
      section: match.section,
      timeWindow: `${match.startLabel} – ${match.endLabel}`,
      duration: match.duration,
      tasksScheduled: match.candidateTasks,
      trainImpact: match.trainImpact,
      priorityCoverage: match.priorityCoverage,
      reason: match.reason,
      blockStatus: match.blockStatus,
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
          subtitle="Block windows, candidate tasks and train overlaps for the planning date."
        />

        <main className="space-y-4 p-4">
          <PlannerSummaryCards summary={data.summary} />

          <PlanningControls
            planningDate={data.planningDate}
            trainCount={data.trains.length}
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
                    {shiftedDepartures.length} of {optimization.schedule.length}{" "}
                    departures shifted to keep the minimum headway
                  </p>
                </div>
                <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {optimization.solver_status}
                </span>
              </div>
              {shiftedDepartures.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-emerald-950 sm:grid-cols-4">
                  {shiftedDepartures.slice(0, 12).map((item) => (
                    <div
                      key={`${item.train_key}-${item.station_id}-${item.stop_order}`}
                      className="rounded-md border border-emerald-200 bg-white px-2.5 py-2"
                    >
                      <div className="font-semibold">
                        {item.train_key} · {item.station_id}
                      </div>
                      <div className="mt-0.5 text-emerald-700">
                        {toClock(item.scheduledMinutes)} →{" "}
                        {toClock(item.cp_sat_departure_minutes)} (+{item.shift}{" "}
                        min)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-emerald-800">
                  No departures needed to move to satisfy the headway.
                </p>
              )}
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_0.9fr]">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <GanttChart
                  rows={data.rows}
                  selectedId={selectedId ?? ""}
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
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  No block windows on this planning date.
                </div>
              )}
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
            Windows and candidate tasks come from the synthetic planning dataset.
            A task is a candidate when its block requirement, block type and
            duration fit the window; this is a pre-optimization view, not a
            scheduled plan. Final approval rests with the authorized planner.
          </div>
        </main>
      </div>
    </div>
  );
}
