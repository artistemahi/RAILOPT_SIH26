import type { WhatIfChange } from "../types/whatIf";
import type { MonthlyVersion, PlanEvent, PlanVersion, PlanVersionSummary } from "../types/versions";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? `${path} returned HTTP ${response.status}`);
  }
  return payload as T;
}

export const listPlanVersions = () => request<PlanVersionSummary[]>("/api/plans");
export const getPlanVersion = (runId: string) => request<PlanVersion>(`/api/plans/${runId}`);
export const getPlanEvents = (runId?: string) =>
  request<PlanEvent[]>(runId ? `/api/plans/${runId}/events` : "/api/plans/events");
export const createPlanVersion = (actor: string) => request<PlanVersion>("/api/plans", { actor });
export const createMonthlyVersion = (actor: string, weeks: number) =>
  request<MonthlyVersion>("/api/plans", { actor, type: "MONTHLY", weeks });
export const getMonthlyVersion = (runId: string) => request<MonthlyVersion>(`/api/plans/${runId}`);
export const approvePlanVersion = (runId: string, actor: string, reason: string) =>
  request<PlanVersionSummary>(`/api/plans/${runId}/approve`, { actor, reason });
export const rejectPlanVersion = (runId: string, actor: string, reason: string) =>
  request<PlanVersionSummary>(`/api/plans/${runId}/reject`, { actor, reason });
export const modifyPlanVersion = (
  runId: string,
  body: { actor: string; reason: string; changes: WhatIfChange[]; pins: Record<string, string> },
) => request<PlanVersion>(`/api/plans/${runId}/modify`, body);
export const replanPlanVersion = (
  runId: string,
  body: { actor: string; reason: string; disruptionTime: string; changes: WhatIfChange[] },
) => request<PlanVersion>(`/api/plans/${runId}/replan`, body);
