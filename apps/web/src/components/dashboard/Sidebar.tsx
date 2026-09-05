import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  AlertIcon,
  DashboardIcon,
  MapIcon,
  RecommendationIcon,
  RiskIcon,
  TrainIcon,
  BarChartIcon,
} from "./icons";

type NavItem = {
  label: string;
  icon: ReactNode;
  to?: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/dashboard" },
  { label: "Risk & Priority", icon: <RiskIcon />, to: "/risk" },
  { label: "Block Planner", icon: <TrainIcon />, to: "/planner" },
  { label: "Network / Map", icon: <MapIcon />, disabled: true },
  { label: "Recommendations", icon: <RecommendationIcon />, disabled: true },
  { label: "What-if / Simulation", icon: <BarChartIcon />, disabled: true },
  { label: "Emergency Replanning", icon: <AlertIcon />, disabled: true },
  { label: "Audit Log", icon: <BarChartIcon />, disabled: true },
  { label: "Reports", icon: <RecommendationIcon />, disabled: true },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-52 flex-col border-r border-slate-200 bg-white/95">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3.5 w-3.5"
          >
            <path d="M4 11.5 12 4l8 7.5" />
            <path d="M6 9.5v8.5h12V9.5" />
            <path d="M9.5 18v-5h5v5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 leading-none">
          <div className="text-[9px] font-semibold tracking-[0.18em] text-blue-700 uppercase">
            RAILOPT
          </div>
          <div className="mt-1 text-[7.5px] text-slate-500">
            Block Planning System
          </div>
          <div className="text-[7.5px] text-slate-500">Indian Railways</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map(({ label, icon, to, disabled }) => {
          const commonClasses =
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60";

          if (disabled || !to) {
            return (
              <button
                key={label}
                type="button"
                className={`${commonClasses} cursor-default text-slate-500`}
                disabled
                aria-disabled="true"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">
                  {icon}
                </span>
                <span className="leading-none">{label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                [
                  commonClasses,
                  isActive
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
              }
              end={to === "/dashboard"}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center",
                      isActive ? "text-blue-700" : "text-slate-500",
                    ].join(" ")}
                  >
                    {icon}
                  </span>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
