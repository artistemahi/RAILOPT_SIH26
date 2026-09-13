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

function getPriority(score: number): RiskTaskResponse["priority"] {
  if (score >= 80) return "P1";
  if (score >= 60) return "P2";
  return "P3";
}

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
  const result = await pool.query(
    `
      SELECT
        t.task_id,
        t.asset_id,
        t.description,
        t.department,
        s.section_code,
        COALESCE(pp.final_priority_score, t.priority_score, 0) AS risk_score,
        GREATEST(CURRENT_DATE - COALESCE(t.due_date, CURRENT_DATE), 0) AS overdue_days,
        COALESCE(t.criticality, a.criticality, 0) AS criticality,
        COALESCE(a.condition_score, 0) AS condition_score,
        COALESCE(t.operational_impact, 0) AS operational_impact,
        COALESCE(t.urgency, 0) AS urgency_score,
        COALESCE(dc.defect_count, 0) AS defect_count
      FROM railopt.maintenance_tasks t
      JOIN railopt.assets a ON a.asset_id = t.asset_id
      JOIN railopt.sections s ON s.section_id = t.section_id
      LEFT JOIN LATERAL (
        SELECT final_priority_score
        FROM railopt.priority_predictions
        WHERE task_id = t.task_id
        ORDER BY created_at DESC
        LIMIT 1
      ) pp ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS defect_count
        FROM railopt.defects d
        WHERE d.asset_id = t.asset_id
      ) dc ON TRUE
      ORDER BY COALESCE(pp.final_priority_score, t.priority_score, 0) DESC,
               t.due_date ASC NULLS LAST, t.task_id
    `,
  );

  const tasks = result.rows.map((row) => {
    const riskScore = Number(row.risk_score);
    const overdueDays = Number(row.overdue_days);
    const priority = getPriority(riskScore);
    return {
      assetId: row.asset_id,
      task: row.description ?? row.task_id,
      department: row.department ?? "Unknown",
      section: row.section_code ?? row.section_id,
      riskScore,
      priority,
      overdueDays,
      status: getStatus(riskScore),
      riskProbability: riskScore,
      criticality: Number(row.criticality),
      condition: String(row.condition_score),
      defectHistory: Number(row.defect_count),
      operationalImpact: Number(row.operational_impact),
      urgency: getUrgency(Math.max(riskScore, Number(row.urgency_score))),
    } satisfies RiskTaskResponse;
  });

  const total = tasks.length;
  const p1 = tasks.filter((task) => task.priority === "P1").length;
  const p2 = tasks.filter((task) => task.priority === "P2").length;
  const p3 = tasks.filter((task) => task.priority === "P3").length;

  return {
    summary: [
      { label: "P1 - Critical", value: p1, supportText: percentage(p1, total), tone: "danger" },
      { label: "P2 - High", value: p2, supportText: percentage(p2, total), tone: "warning" },
      { label: "P3 - Medium", value: p3, supportText: percentage(p3, total), tone: "success" },
      { label: "Total Tasks", value: total, supportText: "(100%)", tone: "default" },
    ],
    tasks,
  };
}
