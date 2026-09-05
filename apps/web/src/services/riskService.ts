import { riskSummaryData, riskTaskData } from "./mock/riskData";
import type { RiskSummary, RiskTask } from "../types/risk";

export async function getRiskData(): Promise<{
  summary: RiskSummary[];
  tasks: RiskTask[];
}> {
  return {
    summary: riskSummaryData,
    tasks: riskTaskData,
  };
}
