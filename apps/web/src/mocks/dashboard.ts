import type { DashboardData } from "../types/dashboard";

export const dashboardData: DashboardData = {
  assetSummary: [
    {
      label: "Total Maintenance Tasks",
      value: "500",
      supportText: "↑ 12% vs last week",
      tone: "default",
    },
    {
      label: "Critical / Overdue",
      value: "47",
      supportText: "8% require immediate action",
      tone: "danger",
    },
    {
      label: "Available Block Windows",
      value: "86",
      supportText: "15% increase",
      tone: "success",
    },
    {
      label: "Scheduled Tasks",
      value: "382",
      supportText: "76% completion",
      tone: "default",
    },
    {
      label: "Corridor Availability",
      value: "96.4%",
      supportText: "Operational",
      tone: "success",
    },
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
    blockId: "B-104",
    corridor: "NDLS → CNB",
    timeWindow: "01:15 – 03:45",
    durationHours: "2h 30m",
    compatibleTasks: 3,
    trainImpact: "Low Impact",
    priorityCoverage: "3 Critical Tasks",
  },

  corridorStatus: [
    { name: "NDLS", state: "Normal" },
    { name: "ALD", state: "Normal" },
    { name: "CNB", state: "Busy" },
    { name: "LKO", state: "Selected" },
  ],

  trainImpact: [
    {
      name: "Low Impact",
      value: 62,
      color: "#16A34A",
    },
    {
      name: "Medium Impact",
      value: 27,
      color: "#D97706",
    },
    {
      name: "High Impact",
      value: 11,
      color: "#DC2626",
    },
  ],

  alerts: [
    {
      severity: "CRITICAL",
      title: "Signal failure reported at S-104",
      timestamp: "09 Sep 2026 · 09:45",
    },
    {
      severity: "WARNING",
      title: "Track geometry watch — SEC02",
      timestamp: "09 Sep 2026 · 08:10",
    },
    {
      severity: "INFO",
      title: "Block B-098 completed ahead of schedule",
      timestamp: "08 Sep 2026 · 22:40",
    },
  ],
};