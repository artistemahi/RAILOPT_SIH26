export interface PlanningSummary {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

export interface PlanningBlock {
  id: string;
  rowId: string;
  section: string;
  startHour: number;
  endHour: number;
  impact: "Low" | "Medium" | "High" | "Approved";
  status: "Low Impact" | "Medium Impact" | "High Impact" | "Approved";
  startLabel: string;
  endLabel: string;
  duration: string;
}

export interface GanttRow {
  id: string;
  label: string;
  section: string;
  blocks: PlanningBlock[];
}

export interface SelectedBlock {
  id: string;
  section: string;
  timeWindow: string;
  duration: string;
  tasksScheduled: number;
  trainImpact: "High" | "Medium" | "Low";
  priorityCoverage: "High" | "Medium" | "Low";
  reason: string;
}

export interface ConstraintStatus {
  name: string;
  state: "OK" | "Warning" | "Conflict";
  value: string;
}

export interface PendingTask {
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  priority: "P1" | "P2" | "P3";
  reason: string;
}

export const planningSummaryData: PlanningSummary[] = [
  { label: "Planning Date", value: "20 May 2025", tone: "default" },
  { label: "Corridor", value: "C1", subtext: "NDLS – KANPUR", tone: "default" },
  {
    label: "Blocks Planned",
    value: "8",
    subtext: "(02:00 – 20:00)",
    tone: "default",
  },
  { label: "Tasks Scheduled", value: "24", subtext: "of 31", tone: "default" },
  { label: "Train Impact", value: "LOW", tone: "success" },
];

export const ganttRows: GanttRow[] = [
  {
    id: "row-1",
    label: "NDLS – ALD",
    section: "SEC01",
    blocks: [
      {
        id: "B101",
        rowId: "row-1",
        section: "NDLS – ALD (SEC01)",
        startHour: 2,
        endHour: 5,
        impact: "Low",
        status: "Low Impact",
        startLabel: "02:00",
        endLabel: "05:00",
        duration: "03:00 Hrs",
      },
      {
        id: "B102",
        rowId: "row-1",
        section: "NDLS – ALD (SEC01)",
        startHour: 11,
        endHour: 14,
        impact: "Approved",
        status: "Approved",
        startLabel: "11:00",
        endLabel: "14:00",
        duration: "03:00 Hrs",
      },
      {
        id: "B103",
        rowId: "row-1",
        section: "NDLS – ALD (SEC01)",
        startHour: 17,
        endHour: 20,
        impact: "Medium",
        status: "Medium Impact",
        startLabel: "17:00",
        endLabel: "20:00",
        duration: "03:00 Hrs",
      },
    ],
  },
  {
    id: "row-2",
    label: "ALD – CNB",
    section: "SEC02",
    blocks: [
      {
        id: "B104",
        rowId: "row-2",
        section: "ALD – CNB (SEC02)",
        startHour: 2.5,
        endHour: 5.5,
        impact: "High",
        status: "High Impact",
        startLabel: "02:30",
        endLabel: "05:30",
        duration: "03:00 Hrs",
      },
      {
        id: "B105",
        rowId: "row-2",
        section: "ALD – CNB (SEC02)",
        startHour: 8,
        endHour: 11,
        impact: "Low",
        status: "Low Impact",
        startLabel: "08:00",
        endLabel: "11:00",
        duration: "03:00 Hrs",
      },
      {
        id: "B106",
        rowId: "row-2",
        section: "ALD – CNB (SEC02)",
        startHour: 15,
        endHour: 18,
        impact: "Medium",
        status: "Medium Impact",
        startLabel: "15:00",
        endLabel: "18:00",
        duration: "03:00 Hrs",
      },
    ],
  },
  {
    id: "row-3",
    label: "CNB – KANPUR",
    section: "SEC03",
    blocks: [
      {
        id: "B107",
        rowId: "row-3",
        section: "CNB – KANPUR (SEC03)",
        startHour: 3,
        endHour: 6,
        impact: "Low",
        status: "Low Impact",
        startLabel: "03:00",
        endLabel: "06:00",
        duration: "03:00 Hrs",
      },
      {
        id: "B108",
        rowId: "row-3",
        section: "CNB – KANPUR (SEC03)",
        startHour: 9,
        endHour: 12,
        impact: "Approved",
        status: "Approved",
        startLabel: "09:00",
        endLabel: "12:00",
        duration: "03:00 Hrs",
      },
      {
        id: "B109",
        rowId: "row-3",
        section: "CNB – KANPUR (SEC03)",
        startHour: 16,
        endHour: 19,
        impact: "High",
        status: "High Impact",
        startLabel: "16:00",
        endLabel: "19:00",
        duration: "03:00 Hrs",
      },
    ],
  },
  {
    id: "row-4",
    label: "KANPUR – LKO",
    section: "SEC04",
    blocks: [
      {
        id: "B110",
        rowId: "row-4",
        section: "KANPUR – LKO (SEC04)",
        startHour: 12,
        endHour: 15,
        impact: "Low",
        status: "Low Impact",
        startLabel: "12:00",
        endLabel: "15:00",
        duration: "03:00 Hrs",
      },
    ],
  },
];

export const selectedBlockData: SelectedBlock = {
  id: "B104",
  section: "ALD – CNB (SEC02)",
  timeWindow: "02:30 – 05:30",
  duration: "03:00 Hrs",
  tasksScheduled: 3,
  trainImpact: "High",
  priorityCoverage: "High",
  reason: "High risk tasks and track geometry constraints",
};

export const constraintData: ConstraintStatus[] = [
  { name: "Track Availability", state: "OK", value: "OK" },
  { name: "Train Path Constraints", state: "Conflict", value: "2 Conflicts" },
  { name: "Crew Availability", state: "OK", value: "OK" },
  { name: "Safety Buffer", state: "OK", value: "OK" },
  { name: "Block Length", state: "OK", value: "OK" },
  { name: "Simultaneous Blocks", state: "Warning", value: "1 Warning" },
];

export const pendingTasksData: PendingTask[] = [
  {
    assetId: "S502",
    task: "Signal Cable Replacement",
    department: "S&T",
    section: "SEC02",
    riskScore: 65,
    priority: "P2",
    reason: "No feasible block in horizon",
  },
  {
    assetId: "T663",
    task: "Track Geometry Check",
    department: "Engineering",
    section: "SEC03",
    riskScore: 58,
    priority: "P3",
    reason: "Train path congestion",
  },
  {
    assetId: "O778",
    task: "OHE Tensioning",
    department: "TRD",
    section: "SEC04",
    riskScore: 45,
    priority: "P3",
    reason: "Crew not available",
  },
  {
    assetId: "T889",
    task: "Ballast Cleaning",
    department: "Engineering",
    section: "SEC02",
    riskScore: 40,
    priority: "P3",
    reason: "No feasible block in horizon",
  },
  {
    assetId: "S901",
    task: "Relay Testing",
    department: "S&T",
    section: "SEC01",
    riskScore: 38,
    priority: "P3",
    reason: "Low risk - deprioritized",
  },
];
