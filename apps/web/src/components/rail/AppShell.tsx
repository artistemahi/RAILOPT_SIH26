import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const pageNames: Record<string, string> = {
  "/overview": "Command Center",
  "/planning": "Planning Run",
  "/tasks": "Maintenance Tasks",
  "/blocks": "Block Windows",
  "/compatibility": "Coordination",
  "/optimizer": "Optimization",
  "/schedule": "Schedule",
  "/validation": "Validation",
  "/what-if": "What-if",
  "/replanning": "Replanning",
  "/analytics": "Analytics",
  "/risk": "Risk & Priority",
  "/network": "Network Map",
  "/integration": "Data Sources",
  "/quality": "Data Quality",
  "/settings": "Settings",
};

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="rail-app-shell">
      <Sidebar />
      <div className="rail-workspace-column">
        <TopBar pageName={pageNames[pathname] ?? "RAILOPT"} />
        <main className="rail-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
