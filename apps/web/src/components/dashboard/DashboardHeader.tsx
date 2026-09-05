import { BellIcon, ClockIcon, RefreshIcon, UserIcon } from "./icons";

export function DashboardHeader({
  title = "Dashboard",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <div className="text-[15px] font-semibold tracking-tight text-slate-800">
          {title}
        </div>
        {subtitle ? (
          <div className="text-[11px] text-slate-500">{subtitle}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5 text-sm text-slate-600">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
          Demo Environment
        </span>

        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
          <ClockIcon />
          <span>20 May 2025 | 10:30 AM</span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          <RefreshIcon />
          Refresh
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          <BellIcon />
        </button>

        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <UserIcon />
          </span>
          <span className="text-[11px] font-medium text-slate-700">
            Planner
          </span>
        </div>
      </div>
    </header>
  );
}
