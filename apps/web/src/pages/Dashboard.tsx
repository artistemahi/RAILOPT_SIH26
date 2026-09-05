import { useEffect, useState } from "react";
import { AlertList } from "../components/dashboard/AlertList";
import { CorridorOverview } from "../components/dashboard/CorridorOverview";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { RecommendationCard } from "../components/dashboard/RecommendationCard";
import { RiskTable } from "../components/dashboard/RiskTable";
import { Sidebar } from "../components/dashboard/Sidebar";
import { StatCard } from "../components/dashboard/StatCard";
import { TrainImpactSummary } from "../components/dashboard/TrainImpactSummary";
import { getDashboardData } from "../services/dashboardService";
import type { DashboardData } from "../types/dashboard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void getDashboardData().then(setData);
  }, []);

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
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.assetSummary.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.75fr_0.95fr]">
            <RiskTable tasks={data.maintenanceTasks} />
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
