import type { RiskSummary, RiskTask } from "../types/risk";

export interface RiskData {
  summary: RiskSummary[];
  tasks: RiskTask[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

function isRiskData(value: unknown): value is RiskData {
  if (typeof value !== "object" || value === null) return false;

  const risk = value as Partial<RiskData>;
  return Array.isArray(risk.summary) && Array.isArray(risk.tasks);
}

export async function getRiskData(): Promise<RiskData> {
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/risk`);

    if (!response.ok) {
      throw new Error(`Risk API returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isRiskData(payload)) {
      throw new Error("Risk API returned an invalid response");
    }

    return {
      summary: payload.summary.map((item) => ({ ...item })),
      tasks: payload.tasks.map((task) => ({ ...task })),
    };
  } catch (error) {
    console.error("Unable to load risk data from the Node API:", error);
    throw new Error("Risk data is unavailable");
  }
}
