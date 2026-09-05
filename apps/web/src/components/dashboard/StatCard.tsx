import type { AssetSummary } from "../../types/dashboard";

const toneStyles = {
  default: {
    border: "border-slate-200 bg-white",
    icon: "bg-slate-100 text-slate-700",
    value: "text-slate-900",
  },
  success: {
    border: "border-slate-200 bg-white",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  warning: {
    border: "border-slate-200 bg-white",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
  },
  danger: {
    border: "border-slate-200 bg-white",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-700",
  },
} as const;

const iconMap = {
  default: "▣",
  success: "✓",
  warning: "◉",
  danger: "!",
} as const;

export function StatCard({ item }: { item: AssetSummary }) {
  const style = toneStyles[item.tone];

  return (
    <div
      className={`flex min-h-[92px] flex-col justify-between rounded-xl border ${style.border} px-3 py-2.5`}
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
        {item.supportText ? (
          <div className="pb-1 text-[10px] text-slate-500">
            {item.supportText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
