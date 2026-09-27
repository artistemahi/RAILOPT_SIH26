import {
  describeTask,
  getActiveTasks,
  getPlanningDate,
  toConditionLabel,
  toPriorityLevel,
  type PriorityLevel,
  type PriorityScoreSource,
} from "./planning-context.js";

const MAX_TASKS = 100;

type RiskTaskResponse = {
  taskId: string;
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  scoreSource: PriorityScoreSource;
  overrideReason: string | null;
  priority: PriorityLevel;
  overdueDays: number;
  status: "Attention Required" | "Monitor" | "Normal";
  taskStatus: string;
  riskProbability: number;
  criticality: number;
  urgencyScore: number;
  condition: string;
  conditionScore: number | null;
  defectHistory: number;
  operationalImpact: number;
  urgency: "Critical" | "High" | "Medium";
};

type RiskSummary = {
  label: string;
  value: number;
  supportText: string;
  tone: "danger" | "warning" | "success" | "default";
};

export type RiskResponse = {
  planningDate: string;
  summary: RiskSummary[];
  tasks: RiskTaskResponse[];
};

function getUrgency(score: number): RiskTaskResponse["urgency"] {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  return "Medium";
}

function getStatus(score: number): RiskTaskResponse["status"] {
  if (score >= 80) return "Attention Required";
  if (score >= 65) return "Monitor";
  return "Normal";
}

function percentage(value: number, total: number): string {
  return total ? `(${((value / total) * 100).toFixed(1)}%)` : "(0.0%)";
}

export async function getRiskData(): Promise<RiskResponse> {
  const planningDate = await getPlanningDate();
  const activeTasks = await getActiveTasks(planningDate);

  const tasks = activeTasks.map((task) => {
    const score = task.priorityScore;
    return {
      taskId: task.taskId,
      assetId: task.assetId,
      task: describeTask(task),
      department: task.department,
      section: task.sectionId,
      riskScore: score,
      scoreSource: task.scoreSource,
      overrideReason: task.overrideReason,
      priority: toPriorityLevel(score),
      overdueDays: task.overdueDays,
      status: getStatus(score),
      taskStatus: task.status,
      // No separate risk-probability model exists yet; this is the priority score.
      riskProbability: score,
      criticality: Math.round(task.criticality),
      urgencyScore: Math.round(task.urgency),
      condition: toConditionLabel(task.conditionScore),
      conditionScore: task.conditionScore,
      defectHistory: task.openDefects,
      operationalImpact: Math.round(task.operationalImpact),
      urgency: getUrgency(score),
    } satisfies RiskTaskResponse;
  });

  const totalTasks = tasks.length;
  const count = (level: PriorityLevel) =>
    tasks.filter((task) => task.priority === level).length;
  const p1Tasks = count("P1");
  const p2Tasks = count("P2");
  const p3Tasks = count("P3");

  return {
    planningDate,
    summary: [
      {
        label: "P1 - Critical",
        value: p1Tasks,
        supportText: percentage(p1Tasks, totalTasks),
        tone: "danger",
      },
      {
        label: "P2 - High",
        value: p2Tasks,
        supportText: percentage(p2Tasks, totalTasks),
        tone: "warning",
      },
      {
        label: "P3 - Medium / Low",
        value: p3Tasks,
        supportText: percentage(p3Tasks, totalTasks),
        tone: "success",
      },
      {
        label: "Active Tasks",
        value: totalTasks,
        supportText: "(100%)",
        tone: "default",
      },
    ],
    tasks: tasks.slice(0, MAX_TASKS),
  };
}
