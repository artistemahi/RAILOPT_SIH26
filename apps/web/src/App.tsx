import { Navigate, Route, Routes } from "react-router-dom";
import BlockPlannerPage from "./pages/BlockPlanner";
import DashboardPage from "./pages/Dashboard";
import RiskManagementPage from "./pages/RiskManagement";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/risk" element={<RiskManagementPage />} />
      <Route path="/planner" element={<BlockPlannerPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
