import type { AlertItem } from "../../types/dashboard";

const severityStyles = {
  CRITICAL: "bg-rose-100 text-rose-700",
  WARNING: "bg-amber-100 text-amber-700",
  INFO: "bg-slate-200 text-slate-700",
};

const severityIcons = {
  CRITICAL: "!",
  WARNING: "⚠",
  INFO: "i",
};

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-slate-800">
          Recent Alerts
        </h2>
        <button
          type="button"
          className="text-[11px] font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          View All
        </button>
      </div>

      <div className="space-y-2.5">
        {alerts.map((alert) => (
          <div
            key={`${alert.title}-${alert.timestamp}`}
            className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0"
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${severityStyles[alert.severity]}`}
            >
              {severityIcons[alert.severity]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-800">
                  {alert.title}
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-500">
                  {alert.severity}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {alert.timestamp}
              </div>
            </div>
            <button
              type="button"
              aria-label={`View alert ${alert.title}`}
              className="pt-0.5 text-lg leading-none text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              ›
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
