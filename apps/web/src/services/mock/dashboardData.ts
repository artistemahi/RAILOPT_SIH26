import type { DashboardData } from "../../types/dashboard";

export const dashboardMockData: DashboardData = {
  assetSummary: [
    { label: "Total Assets", value: "1,284", tone: "default" },
    {
      label: "High Risk Assets",
      value: "87",
      supportText: "(6.8%)",
      tone: "danger",
    },
    { label: "Active Blocks", value: "31", tone: "warning" },
    { label: "Asset Availability", value: "94%", tone: "success" },
    { label: "Train Impact", value: "LOW", tone: "default" },
  ],
  maintenanceTasks: [
    {
      assetId: "A104",
      task: "Signal Repair",
      department: "S&T",
      priority: "P1",
      riskScore: 87,
      overdueDays: 17,
    },
    {
      assetId: "T221",
      task: "Track Inspection",
      department: "Engineering",
      priority: "P1",
      riskScore: 81,
      overdueDays: 12,
    },
    {
      assetId: "S309",
      task: "Switch Maintenance",
      department: "S&T",
      priority: "P2",
      riskScore: 72,
      overdueDays: 8,
    },
    {
      assetId: "O112",
      task: "Overhead Line Check",
      department: "TRD",
      priority: "P2",
      riskScore: 68,
      overdueDays: 6,
    },
    {
      assetId: "T118",
      task: "Track Renewal",
      department: "Engineering",
      priority: "P3",
      riskScore: 55,
      overdueDays: 3,
    },
  ],
  recommendedBlock: {
    blockId: "B104",
    corridor: "C1",
    timeWindow: "02:00 – 05:00",
    durationHours: "03:00 Hrs",
    compatibleTasks: 3,
    trainImpact: "Low",
    priorityCoverage: "High",
  },
  corridorStatus: [
    { name: "NDLS", state: "Normal" },
    { name: "ALD", state: "Normal" },
    { name: "CNB", state: "Busy" },
    { name: "KANPUR", state: "Blocked" },
    { name: "LKO", state: "Selected" },
  ],
  trainImpact: [
    { name: "Low Impact", value: 68, color: "#22c55e" },
    { name: "Medium Impact", value: 22, color: "#f59e0b" },
    { name: "High Impact", value: 10, color: "#ef4444" },
  ],
  alerts: [
    {
      severity: "CRITICAL",
      title: "Signal failure reported at S-104",
      timestamp: "20 May 2025 | 09:45 AM",
    },
    {
      severity: "WARNING",
      title: "C1 corridor congestion expected",
      timestamp: "20 May 2025 | 09:20 AM",
    },
    {
      severity: "INFO",
      title: "Block B103 completed successfully",
      timestamp: "20 May 2025 | 08:30 AM",
    },
  ],
};
