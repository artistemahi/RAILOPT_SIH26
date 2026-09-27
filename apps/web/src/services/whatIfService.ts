import type { WhatIfChange, WhatIfOptions, WhatIfResult } from "../types/whatIf";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

export async function getWhatIfOptions(): Promise<WhatIfOptions> {
  const response = await fetch(`${apiBaseUrl}/api/planner/what-if/options`);
  if (!response.ok) {
    throw new Error(`What-if options API returned HTTP ${response.status}`);
  }
  return (await response.json()) as WhatIfOptions;
}

export async function runWhatIf(changes: WhatIfChange[]): Promise<WhatIfResult> {
  const response = await fetch(`${apiBaseUrl}/api/planner/what-if`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ changes }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `What-if API returned HTTP ${response.status}`);
  }
  return body as WhatIfResult;
}
