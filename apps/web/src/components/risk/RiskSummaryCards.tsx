import type { RiskSummary } from "../../types/risk";

const toneStyles = {
  danger: {
    panel: "border-slate-200 bg-white",
    icon: "bg-red-100 text-red-700",
    value: "text-red-700",
  },
  warning: {
    panel: "border-slate-200 bg-white",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
  },
  success: {
    panel: "border-slate-200 bg-white",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  default: {
    panel: "border-slate-200 bg-white",
    icon: "bg-blue-100 text-blue-700",
    value: "text-slate-900",
  },
} as const;

const iconMap = {
  danger: "!",
  warning: "!",
  success: "✓",
  default: "☰",
} as const;

export function RiskSummaryCards({ summary }: { summary: RiskSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {summary.map((item) => {
        const style = toneStyles[item.tone];

        return (
          <div
            key={item.label}
            className={`flex min-h-[92px] flex-col justify-between rounded-xl border ${style.panel} px-3 py-2.5`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium tracking-[0.01em] text-slate-600">
                {item.label}
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold ${style.icon}`}
              >
                {iconMap[item.tone]}
              </span>
            </div>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div
                className={`text-[19px] font-semibold tracking-tight ${style.value}`}
              >
                {item.value}
              </div>
              <div className="pb-1 text-[10px] text-slate-500">
                {item.supportText}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
