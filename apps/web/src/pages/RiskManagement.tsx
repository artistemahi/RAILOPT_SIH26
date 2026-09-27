import { useEffect, useMemo, useState } from "react";
import { RiskDetailsPanel } from "../components/risk/RiskDetailsPanel";
import {
  emptyRiskFilters,
  RiskFilters,
  type RiskFilterState,
} from "../components/risk/RiskFilters";
import { RiskSummaryCards } from "../components/risk/RiskSummaryCards";
import { RiskTable } from "../components/risk/RiskTable";
import { getRiskData, type RiskData } from "../services/riskService";
import type { RiskDetails, RiskTask } from "../types/risk";

const factorPalette = {
  criticality: "#ef4444",
  urgency: "#f97316",
  impact: "#3b82f6",
  condition: "#22c55e",
  defects: "#f59e0b",
};

function toDetails(task: RiskTask): RiskDetails {
  const degradation =
    task.conditionScore === null ? null : Math.round(100 - task.conditionScore);

  return {
    taskId: task.taskId,
    assetId: task.assetId,
    task: task.task,
    department: task.department,
    section: task.section,
    priorityScore: task.riskScore,
    scoreSource: task.scoreSource,
    overrideReason: task.overrideReason,
    priority: task.priority,
    taskStatus: task.taskStatus,
    overdueDays: task.overdueDays,
    condition:
      task.conditionScore === null
        ? task.condition
        : `${task.condition} (${task.conditionScore})`,
    factors: [
      {
        label: "Task Criticality",
        value: task.criticality,
        display: String(task.criticality),
        color: factorPalette.criticality,
      },
      {
        label: "Urgency",
        value: task.urgencyScore,
        display: String(task.urgencyScore),
        color: factorPalette.urgency,
      },
      {
        label: "Operational Impact",
        value: task.operationalImpact,
        display: String(task.operationalImpact),
        color: factorPalette.impact,
      },
      {
        label: "Asset Degradation (100 − condition)",
        value: degradation ?? 0,
        display: degradation === null ? "n/a" : String(degradation),
        color: factorPalette.condition,
      },
      {
        label: "Open Defects on Asset",
        value: Math.min(100, task.defectHistory * 10),
        display: String(task.defectHistory),
        color: factorPalette.defects,
      },
    ],
    riskLevel:
      task.priority === "P1" ? "Critical" : task.priority === "P2" ? "High" : "Medium/Low",
    urgency: task.urgency,
  };
}

export default function RiskManagementPage() {
  const [data, setData] = useState<RiskData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RiskFilterState>(emptyRiskFilters);

  useEffect(() => {
    void getRiskData()
      .then(setData)
      .catch(() => {
        setError(
          "Risk data is unavailable. Check the API connection and retry.",
        );
      });
  }, []);

  const departments = useMemo(
    () => [...new Set(data?.tasks.map((task) => task.department))].sort(),
    [data],
  );
  const sections = useMemo(
    () => [...new Set(data?.tasks.map((task) => task.section))].sort(),
    [data],
  );

  const visibleTasks = useMemo(
    () =>
      (data?.tasks ?? []).filter(
        (task) =>
          (!filters.department || task.department === filters.department) &&
          (!filters.priority || task.priority === filters.priority) &&
          (!filters.section || task.section === filters.section),
      ),
    [data, filters],
  );

  const selectedTask = useMemo(() => {
    const task =
      visibleTasks.find((item) => item.taskId === selectedTaskId) ??
      visibleTasks[0];
    return task ? toDetails(task) : null;
  }, [visibleTasks, selectedTaskId]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-6 p-6 text-center text-slate-600">
        <div className="rounded-xl border border-rose-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            Risk data unavailable
          </p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-600">
        Loading risk data...
      </div>
    );
  }

  return (
    <div className="space-y-4 text-slate-900">

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-slate-800">
                Risk & Priority
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Active maintenance tasks ranked by priority score · planning
                date {data.planningDate}
              </p>
            </div>
            <div className="hidden rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-right md:block">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                Attention queue
              </div>
              <div className="mt-0.5 text-lg font-semibold text-rose-700">
                {data.summary[0]?.value ?? 0}
              </div>
              <div className="text-[10px] text-rose-600">P1 tasks</div>
            </div>
          </div>

          <RiskSummaryCards summary={data.summary} />

          <RiskFilters
            departments={departments}
            sections={sections}
            value={filters}
            onChange={setFilters}
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.85fr_0.95fr]">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between text-[14px] font-semibold text-slate-800">
                  <span>Maintenance Priority List</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {visibleTasks.length} of top {data.tasks.length} shown
                  </span>
                </div>
                {visibleTasks.length ? (
                  <RiskTable
                    tasks={visibleTasks}
                    selectedId={selectedTask?.taskId ?? ""}
                    onSelect={setSelectedTaskId}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No tasks match these filters.
                  </div>
                )}
              </div>
            </div>

            <div>
              {selectedTask ? (
                <RiskDetailsPanel details={selectedTask} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Select a task to view its priority inputs.
                </div>
              )}
            </div>
          </section>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            Priority scores come from the ML priority model (refreshed on every
            block plan run) unless an authorized planner has set a manual
            override, which takes precedence. Before the first ML run the dataset
            score is shown. Priorities are soft inputs; hard operational
            constraints are enforced separately by CP-SAT.
          </div>
    </div>
  );
}
