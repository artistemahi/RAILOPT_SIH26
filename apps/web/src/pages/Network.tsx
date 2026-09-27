import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { Sidebar } from "../components/dashboard/Sidebar";
import { RailMap, type SectionStyle } from "../components/network/RailMap";
import { generateBlockPlan } from "../services/blockPlannerService";
import { getNetwork } from "../services/networkService";
import type { NetworkData, NetworkSection } from "../types/network";
import type { BlockPlan } from "../types/planner";

type Mode = "priority" | "trains" | "plan";

const DAY_MS = 86_400_000;

const legends: Record<Mode, Array<[string, string]>> = {
  priority: [
    ["#dc2626", "Has P1 work (score ≥ 80)"],
    ["#f59e0b", "Has P2 work (65–79)"],
    ["#16a34a", "P3 only"],
  ],
  trains: [
    ["#dc2626", "Busiest third of sections"],
    ["#f59e0b", "Middle third"],
    ["#16a34a", "Quietest third"],
  ],
  plan: [
    ["#1d4ed8", "3+ tasks planned that day"],
    ["#60a5fa", "1–2 tasks planned"],
    ["#cbd5e1", "No planned work"],
  ],
};

export default function NetworkPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<BlockPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [day, setDay] = useState(0);

  useEffect(() => {
    void getNetwork()
      .then((network) => {
        setData(network);
        setSelectedId(network.sections[0]?.sectionId ?? null);
      })
      .catch(() => setError("Network data is unavailable. Check the API connection."));
  }, []);

  async function loadPlan() {
    setPlanning(true);
    setPlanError(null);
    try {
      setPlan(await generateBlockPlan());
      setMode("plan");
    } catch {
      setPlanError("Block planning failed. Check that the optimizer service is running.");
    } finally {
      setPlanning(false);
    }
  }

  const dayAssignments = useMemo(() => {
    if (!plan) return [];
    return plan.assignments.filter(
      (item) => Math.floor(item.start_minute / (24 * 60)) === day,
    );
  }, [plan, day]);

  const trainThresholds = useMemo(() => {
    const counts = (data?.sections ?? []).map((section) => section.trainsOnPlanningDate).sort((a, b) => a - b);
    const at = (fraction: number) => counts[Math.floor((counts.length - 1) * fraction)] ?? 0;
    return { low: at(1 / 3), high: at(2 / 3) };
  }, [data]);

  const styleFor = useCallback(
    (section: NetworkSection): SectionStyle => {
      if (mode === "trains") {
        const trains = section.trainsOnPlanningDate;
        const color =
          trains > trainThresholds.high ? "#dc2626" : trains > trainThresholds.low ? "#f59e0b" : "#16a34a";
        return { color, weight: 7, label: `${trains} train movements on the planning date` };
      }
      if (mode === "plan") {
        const planned = dayAssignments.filter((item) => item.section_id === section.sectionId).length;
        const color = planned >= 3 ? "#1d4ed8" : planned > 0 ? "#60a5fa" : "#cbd5e1";
        return { color, weight: 5 + Math.min(planned, 6), label: `${planned} task(s) planned this day` };
      }
      const color = section.p1Tasks ? "#dc2626" : section.p2Tasks ? "#f59e0b" : "#16a34a";
      return {
        color,
        weight: 4 + Math.min(Math.round(section.activeTasks / 6), 6),
        label: `${section.activeTasks} active tasks · ${section.p1Tasks} P1 · ${section.p2Tasks} P2`,
      };
    },
    [mode, dayAssignments, trainThresholds],
  );

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-sm text-slate-600">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading network...
      </div>
    );
  }

  const selected = data.sections.find((section) => section.sectionId === selectedId) ?? null;
  const planDays = plan
    ? Array.from({ length: plan.horizon_days }, (_, index) =>
        new Date(new Date(`${plan.planning_date}T00:00:00`).getTime() + index * DAY_MS).toLocaleDateString(
          "en-GB",
          { day: "2-digit", month: "short" },
        ),
      )
    : [];
  const selectedPlanned = selected
    ? dayAssignments.filter((item) => item.section_id === selected.sectionId)
    : [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="ml-52 min-h-screen bg-slate-100">
        <DashboardHeader
          title="Network / Map"
          subtitle="Stations and sections with maintenance priority, train load and the block plan."
        />

        <main className="space-y-4 p-4">
          <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            {(
              [
                ["priority", "Maintenance priority"],
                ["trains", "Train load"],
                ["plan", "Block plan"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={value === "plan" && !plan}
                onClick={() => setMode(value)}
                className={[
                  "rounded-md border px-3 py-1.5 text-[12px] font-medium",
                  mode === value
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadPlan()}
              disabled={planning}
              className="rounded-md bg-blue-700 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {planning ? "Planning..." : plan ? "Re-run block plan" : "Load block plan (ML → CP-SAT)"}
            </button>
            {mode === "plan" && plan ? (
              <div className="flex flex-wrap gap-1">
                {planDays.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDay(index)}
                    className={[
                      "rounded border px-2 py-1 text-[11px]",
                      day === index
                        ? "border-blue-300 bg-blue-50 font-semibold text-blue-700"
                        : "border-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="ml-auto text-[11px] text-slate-500">
              Synthetic network · planning date {data.planningDate}
            </span>
            {planError ? (
              <div className="w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {planError}
              </div>
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              <RailMap
                stations={data.stations}
                sections={data.sections}
                styleFor={styleFor}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <div className="mt-2 flex flex-wrap items-center gap-4 px-2 pb-1 text-[11px] text-slate-600">
                {legends[mode].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-6 rounded" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
                <span className="text-slate-400">
                  {mode === "trains" ? "" : `Line width grows with ${mode === "plan" ? "planned tasks" : "active tasks"} · `}
                  Click a section for details
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {selected ? (
                <>
                  <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    Section
                  </div>
                  <div className="mt-1 text-[16px] font-semibold text-slate-900">
                    {selected.sectionId} · {selected.fromStation}–{selected.toStation}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    {(
                      [
                        ["Length", selected.lengthKm === null ? "–" : `${selected.lengthKm} km`],
                        ["Tracks", selected.trackCount ?? "–"],
                        ["Electrified", selected.electrified ? "Yes" : "No"],
                        ["Status", selected.operationalStatus ?? "–"],
                        ["Active tasks", `${selected.activeTasks} (${selected.p1Tasks} P1 · ${selected.p2Tasks} P2)`],
                        ["Open critical defects", selected.openCriticalDefects],
                        ["Out-of-service assets", selected.outOfServiceAssets],
                        [`Available windows (${data.horizonDays} d)`, selected.availableWindows],
                        ["Trains on planning date", selected.trainsOnPlanningDate],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <div className="text-slate-500">{label}</div>
                        <div className="font-semibold text-slate-800">{value}</div>
                      </div>
                    ))}
                  </div>

                  {mode === "plan" && plan ? (
                    <div className="mt-4">
                      <div className="mb-1 text-[12px] font-semibold text-slate-800">
                        Planned on {planDays[day]} ({selectedPlanned.length})
                      </div>
                      {selectedPlanned.length ? (
                        <ul className="space-y-1 text-[11px]">
                          {selectedPlanned.map((item) => (
                            <li key={item.task_id} className="rounded border border-blue-100 bg-blue-50 px-2 py-1">
                              <span className="font-semibold">{item.task_id}</span> · {item.department} ·{" "}
                              {item.start.slice(11)}–{item.end.slice(11)} · {item.window_id}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[11px] text-slate-500">No work planned on this section that day.</div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="mb-1 text-[12px] font-semibold text-slate-800">Highest-priority active tasks</div>
                    <ul className="space-y-1 text-[11px]">
                      {selected.topTasks.map((task) => (
                        <li key={task.taskId} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                          <span>
                            <span className="font-semibold text-slate-800">{task.taskId}</span> · {task.task} ·{" "}
                            {task.department}
                          </span>
                          <span
                            className={[
                              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                              task.priority === "P1"
                                ? "bg-red-100 text-red-700"
                                : task.priority === "P2"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700",
                            ].join(" ")}
                          >
                            {task.priority} · {task.priorityScore}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">Click a section on the map.</div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
