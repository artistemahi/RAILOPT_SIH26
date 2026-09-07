import { pool } from "../config/database.js";

type RiskTaskResponse = {
  assetId: string;
  task: string;
  department: string;
  section: string;
  riskScore: number;
  priority: "P1" | "P2" | "P3";
  overdueDays: number;
  status: "Attention Required" | "Monitor" | "Normal";
  riskProbability: number;
  criticality: number;
  condition: string;
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
  summary: RiskSummary[];
  tasks: RiskTaskResponse[];
};

type RiskRow = {
  asset_id: string;
  task: string;
  department: string;
  section: string;
  risk_score: number;
  priority: "P1" | "P2" | "P3";
  overdue_days: number;
  criticality: number;
  condition: string;
};

function getUrgency(riskScore: number): RiskTaskResponse["urgency"] {
  if (riskScore >= 80) return "Critical";
  if (riskScore >= 65) return "High";
  return "Medium";
}

function getStatus(riskScore: number): RiskTaskResponse["status"] {
  if (riskScore >= 80) return "Attention Required";
  if (riskScore >= 65) return "Monitor";
  return "Normal";
}

function percentage(value: number, total: number): string {
  return total ? `(${((value / total) * 100).toFixed(1)}%)` : "(0.0%)";
}

export async function getRiskData(): Promise<RiskResponse> {
  const result = await pool.query<RiskRow>(
    `SELECT
       mt.asset_id,
       mt.task,
       mt.department,
       a.section,
       COALESCE(rp.risk_score, mt.risk_score) AS risk_score,
       mt.priority,
       mt.overdue_days,
       a.criticality,
       a.condition
     FROM maintenance_tasks mt
     INNER JOIN assets a ON a.id = mt.asset_id
     LEFT JOIN LATERAL (
       SELECT risk_score
       FROM risk_predictions
       WHERE maintenance_task_id = mt.id
       ORDER BY prediction_date DESC NULLS LAST, id DESC
       LIMIT 1
     ) rp ON true
     ORDER BY COALESCE(rp.risk_score, mt.risk_score) DESC, mt.id`,
  );

  const tasks = result.rows.map((row) => {
    const riskScore = Number(row.risk_score);
    const overdueDays = Number(row.overdue_days);

    return {
      assetId: row.asset_id,
      task: row.task,
      department: row.department,
      section: row.section,
      riskScore,
      priority: row.priority,
      overdueDays,
      status: getStatus(riskScore),
      riskProbability: riskScore,
      criticality: Number(row.criticality),
      condition: row.condition,
      // These fields are not stored in the current schema; expose transparent
      // numeric proxies so the response remains compatible with RiskTask.
      defectHistory: overdueDays,
      operationalImpact: riskScore,
      urgency: getUrgency(riskScore),
    } satisfies RiskTaskResponse;
  });

  const totalTasks = tasks.length;
  const p1Tasks = tasks.filter((task) => task.priority === "P1").length;
  const p2Tasks = tasks.filter((task) => task.priority === "P2").length;
  const p3Tasks = tasks.filter((task) => task.priority === "P3").length;

  return {
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
        label: "P3 - Medium",
        value: p3Tasks,
        supportText: percentage(p3Tasks, totalTasks),
        tone: "success",
      },
      {
        label: "Total Tasks",
        value: totalTasks,
        supportText: "(100%)",
        tone: "default",
      },
    ],
    tasks,
  };
}
