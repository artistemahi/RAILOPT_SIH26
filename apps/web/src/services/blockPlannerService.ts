import type { BlockPlan } from "../types/planner";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export async function generateBlockPlan(): Promise<BlockPlan> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/api/planner/plan-blocks`,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(`Block planning API returned HTTP ${response.status}`);
  }

  return (await response.json()) as BlockPlan;
}
