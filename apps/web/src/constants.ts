// Priority bands; must match PRIORITY_BANDS in services/api
// (planning-context.ts). P1 = top ~10% of the ML scores of pending tasks.
export const PRIORITY_BANDS = { P1: 70, P2: 60 } as const;
