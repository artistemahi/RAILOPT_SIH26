import type { PlanningSummary } from "../../services/mock/blockPlannerData";

const toneStyles = {
  default: {
    card: "border-slate-200 bg-white",
    icon: "bg-slate-100 text-slate-700",
    value: "text-slate-800",
  },
  success: {
    card: "border-slate-200 bg-white",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  warning: {
    card: "border-slate-200 bg-white",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
  },
  danger: {
    card: "border-slate-200 bg-white",
    icon: "bg-red-100 text-red-700",
    value: "text-red-700",
  },
} as const;

export function PlannerSummaryCards({
  summary,
}: {
  summary: PlanningSummary[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {summary.map((item) => {
        const style = toneStyles[item.tone ?? "default"];

        return (
          <div
            key={item.label}
            className={`flex min-h-[90px] flex-col justify-between rounded-xl border px-3 py-2.5 ${style.card}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium tracking-[0.01em] text-slate-600">
                {item.label}
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold ${style.icon}`}
              >
                {item.label === "Train Impact"
                  ? "↗"
                  : item.label === "Blocks Planned"
                    ? "▣"
                    : item.label === "Tasks Scheduled"
                      ? "✓"
                      : item.label === "Corridor"
                        ? "◌"
                        : "◍"}
              </span>
            </div>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div
                className={`text-[19px] font-semibold tracking-tight ${style.value}`}
              >
                {item.value}
              </div>
              {item.subtext ? (
                <div className="pb-1 text-[10px] text-slate-500">
                  {item.subtext}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
