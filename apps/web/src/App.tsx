import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/rail";
import NetworkPage from "./pages/Network";
import RiskManagementPage from "./pages/RiskManagement";
import WhatIfPage from "./pages/WhatIf";
import Analytics from "./screens/Analytics";
import Blocks from "./screens/Blocks";
import Compatibility from "./screens/Compatibility";
import Integration from "./screens/Integration";
import Optimizer from "./screens/Optimizer";
import Overview from "./screens/Overview";
import PlanningRun from "./screens/PlanningRun";
import Quality from "./screens/Quality";
import Replanning from "./screens/Replanning";
import Schedule from "./screens/Schedule";
import Settings from "./screens/Settings";
import Tasks from "./screens/Tasks";
import Validation from "./screens/Validation";
import Versions from "./screens/Versions";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/overview" element={<Overview />} />
        <Route path="/planning" element={<PlanningRun />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/blocks" element={<Blocks />} />
        <Route path="/compatibility" element={<Compatibility />} />
        <Route path="/optimizer" element={<Optimizer />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/validation" element={<Validation />} />
        <Route path="/what-if" element={<WhatIfPage />} />
        <Route path="/versions" element={<Versions />} />
        <Route path="/replanning" element={<Replanning />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/risk" element={<RiskManagementPage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/integration" element={<Integration />} />
        <Route path="/quality" element={<Quality />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      {/* Old paths from the previous UI */}
      <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
      <Route path="/planner" element={<Navigate to="/schedule" replace />} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
