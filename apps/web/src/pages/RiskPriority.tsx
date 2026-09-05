import { useEffect, useMemo, useState } from "react";
import { RiskSummaryCards } from "../components/risk/RiskSummaryCards";
import { RiskFilters } from "../components/risk/RiskFilters";
import { RiskTable } from "../components/risk/RiskTable";
import { RiskDetailsPanel } from "../components/risk/RiskDetailsPanel";
import { Sidebar } from "../components/dashboard/Sidebar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { getRiskData } from "../services/riskService";
import type { RiskDetails, RiskTask } from "../types/risk";

const riskFactorPalette = {
  criticality: "#ef4444",
  overdue: "#f97316",
  defect: "#f59e0b",
  condition: "#22c55e",
  impact: "#3b82f6",
};

const defaultDetails: RiskDetails = {
  assetId: "A104",
  task: "Signal Repair",
  department: "S&T",
  section: "SEC01",
  riskProbability: 87,
  priority: "P1",
  criticality: 90,
  overdueDays: 17,
  condition: "Poor",
  factors: [
    { label: "Criticality", value: 90, color: riskFactorPalette.criticality },
    { label: "Overdue Days", value: 75, color: riskFactorPalette.overdue },
    { label: "Defect History", value: 60, color: riskFactorPalette.defect },
    { label: "Condition", value: 55, color: riskFactorPalette.condition },
    { label: "Operational Impact", value: 65, color: riskFactorPalette.impact },
  ],
  recommendation: "Prioritize for the next feasible maintenance window.",
  riskLevel: "Critical",
  urgency: "High",
  operationalImpact: "High",
  planningImplication: "Reschedule Needed",
};

export default function RiskPriorityPage() {
  const [data, setData] = useState<{
    summary: any[];
    tasks: RiskTask[];
  } | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("A104");

  useEffect(() => {
    void getRiskData().then(setData);
  }, []);

  const selectedTask = useMemo(() => {
    const task =
      data?.tasks.find((item) => item.assetId === selectedAssetId) ??
      data?.tasks[0];
    if (!task) return null;

    return {
      assetId: task.assetId,
      task: task.task,
      department: task.department,
      section: task.section,
      riskProbability: task.riskProbability,
      priority: task.priority,
      criticality: task.criticality,
      overdueDays: task.overdueDays,
      condition: task.condition,
      factors: [
        {
          label: "Criticality",
          value: task.criticality,
          color: riskFactorPalette.criticality,
        },
        {
          label: "Overdue Days",
          value: Math.min(100, task.overdueDays * 4),
          color: riskFactorPalette.overdue,
        },
        {
          label: "Defect History",
          value: task.defectHistory ?? 60,
          color: riskFactorPalette.defect,
        },
        {
          label: "Condition",
          value:
            task.condition === "Poor"
              ? 55
              : task.condition === "Fair"
                ? 45
                : 30,
          color: riskFactorPalette.condition,
        },
        {
          label: "Operational Impact",
          value: task.operationalImpact ?? 65,
          color: riskFactorPalette.impact,
        },
      ],
      recommendation: "Prioritize for the next feasible maintenance window.",
      riskLevel:
        task.priority === "P1"
          ? "Critical"
          : task.priority === "P2"
            ? "High"
            : "Medium",
      urgency: task.urgency,
      operationalImpact:
        task.priority === "P1"
          ? "High"
          : task.priority === "P2"
            ? "Medium"
            : "Moderate",
      planningImplication:
        task.priority === "P1" ? "Reschedule Needed" : "Window Available",
    } satisfies RiskDetails;
  }, [data, selectedAssetId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading risk data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="ml-52 min-h-screen bg-slate-100">
        <DashboardHeader />

        <main className="space-y-4 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-slate-800">
                Risk & Priority
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Identify high-risk maintenance requiring early attention.
              </p>
            </div>
          </div>

          <RiskSummaryCards summary={data.summary} />

          <RiskFilters />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.85fr_0.95fr]">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-3 text-[14px] font-semibold text-slate-800">
                  Maintenance Risk List
                </div>
                <RiskTable
                  tasks={data.tasks}
                  selectedId={selectedAssetId}
                  onSelect={setSelectedAssetId}
                />
              </div>
            </div>

            <div>
              {selectedTask ? (
                <RiskDetailsPanel details={selectedTask} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Select a task to view risk details.
                </div>
              )}
            </div>
          </section>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            Risk scores are predictive inputs to the scheduling optimizer;
            operational constraints are enforced separately by the optimization
            engine.
          </div>
        </main>
      </div>
    </div>
  );
}
