import { useEffect, useState } from "react";
import { AlertList } from "../components/dashboard/AlertList";
import { CorridorOverview } from "../components/dashboard/CorridorOverview";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { RecommendationCard } from "../components/dashboard/RecommendationCard";
import { RiskTable } from "../components/dashboard/RiskTable";
import { Sidebar } from "../components/dashboard/Sidebar";
import { StatCard } from "../components/dashboard/StatCard";
import { TrainImpactSummary } from "../components/dashboard/TrainImpactSummary";
//import { getDashboardData } from "../services/dashboardService";
import type { DashboardData } from "../types/dashboard";
import { dashboardData } from "../mocks";
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  setData(dashboardData as DashboardData);
  setError(null);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center text-slate-600">
        <div className="rounded-xl border border-rose-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            Dashboard unavailable
          </p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="ml-52 min-h-screen bg-slate-100">
        <DashboardHeader />

        <main className="space-y-3 p-4">
          <section className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                Operational overview
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                See what needs attention first
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Live asset, maintenance, and block data from the operations API.
              </p>
            </div>
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 md:inline-flex">
              Live data
            </span>
          </section>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.assetSummary.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.75fr_0.95fr]">
            {data.maintenanceTasks.length ? (
              <RiskTable tasks={data.maintenanceTasks} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No maintenance tasks are currently available.
              </div>
            )}
            <RecommendationCard recommendation={data.recommendedBlock} />
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr_1fr]">
            <CorridorOverview corridorStatus={data.corridorStatus} />
            <TrainImpactSummary data={data.trainImpact} />
            <AlertList alerts={data.alerts} />
          </section>
        </main>
      </div>
    </div>
  );
}
