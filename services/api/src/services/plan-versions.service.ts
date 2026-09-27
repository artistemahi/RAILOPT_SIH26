import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../config/database.js";
import {
  generateBlockPlan,
  replanFrom,
  type PreviousAssignment,
  type WhatIfChange,
} from "./block-plan.service.js";

// Plan versions: every generated, modified or replanned plan is stored as a
// DRAFT version. Only a planner can approve or reject it; approving one
// supersedes the previously approved version. Every action is logged in
// railopt.plan_events.

export class PlanVersionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

type TriggerType = "PLAN" | "MODIFY" | "REPLAN";

type PlanRow = {
  run_id: string;
  version: number;
  parent_run_id: string | null;
  trigger_type: TriggerType;
  trigger_detail: Record<string, unknown> | null;
  planning_date: string;
  horizon_days: number;
  solver_status: string;
  validation_passed: boolean;
  kpis: Record<string, number>;
  status: string;
  decided_by: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
};

const SUMMARY_COLUMNS = `run_id, version, parent_run_id, trigger_type, trigger_detail,
  to_char(planning_date, 'YYYY-MM-DD') AS planning_date, horizon_days,
  solver_status, validation_passed, kpis, status, decided_by, decision_reason,
  to_char(decided_at, 'YYYY-MM-DD HH24:MI:SS') AS decided_at,
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at`;

const DDL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/database/plan-versions.sql",
);

let tablesReady: Promise<void> | null = null;

/** Create the version tables on first use (no manual migration needed). */
function ensureTables(): Promise<void> {
  tablesReady ??= pool
    .query(fs.readFileSync(DDL_PATH, "utf8"))
    .then(() => undefined)
    .catch((error: unknown) => {
      tablesReady = null;
      throw error;
    });
  return tablesReady;
}

function toSummary(row: PlanRow) {
  return {
    runId: row.run_id,
    version: row.version,
    parentRunId: row.parent_run_id,
    triggerType: row.trigger_type,
    triggerDetail: row.trigger_detail,
    planningDate: row.planning_date,
    horizonDays: row.horizon_days,
    solverStatus: row.solver_status,
    validationPassed: row.validation_passed,
    kpis: row.kpis,
    status: row.status,
    decidedBy: row.decided_by,
    decisionReason: row.decision_reason,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export type PlanVersionSummary = ReturnType<typeof toSummary>;

type PlanResult = Record<string, unknown> & {
  planning_date: string;
  horizon_days: number;
  priority: { source: string; run_id: string | null; model_version: string | null };
  solver: { status: string };
  validation: { passed: boolean };
  kpis: Record<string, number>;
  assignments: PreviousAssignment[];
};

async function logEvent(
  runId: string,
  eventType: string,
  actor: string,
  reason: string | null,
  details: Record<string, unknown> | null = null,
  client: { query: typeof pool.query } = pool,
): Promise<void> {
  await client.query(
    `INSERT INTO railopt.plan_events (run_id, event_type, actor, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [runId, eventType, actor, reason, details],
  );
}

async function saveVersion(
  result: PlanResult,
  trigger: TriggerType,
  actor: string,
  reason: string | null,
  parentRunId: string | null,
  detail: Record<string, unknown> | null,
): Promise<PlanVersionSummary> {
  await ensureTables();
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const inserted = await pool.query<PlanRow>(
    `INSERT INTO railopt.planning_runs
       (run_id, version, parent_run_id, trigger_type, trigger_detail, planning_date,
        horizon_days, priority_source, priority_run_id, model_version, solver_status,
        validation_passed, kpis, result)
     VALUES ($1, (SELECT COALESCE(MAX(version), 0) + 1 FROM railopt.planning_runs),
             $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${SUMMARY_COLUMNS}`,
    [
      runId,
      parentRunId,
      trigger,
      detail,
      result.planning_date,
      result.horizon_days,
      result.priority.source,
      result.priority.run_id,
      result.priority.model_version,
      result.solver.status,
      result.validation.passed,
      result.kpis,
      result,
    ],
  );
  await logEvent(runId, "CREATED", actor, reason, { trigger, parentRunId });
  return toSummary(inserted.rows[0]!);
}

async function loadRow(runId: string): Promise<PlanRow & { result: PlanResult }> {
  await ensureTables();
  const found = await pool.query<PlanRow & { result: PlanResult }>(
    `SELECT ${SUMMARY_COLUMNS}, result FROM railopt.planning_runs WHERE run_id = $1`,
    [runId],
  );
  const row = found.rows[0];
  if (!row) throw new PlanVersionError(`Plan version ${runId} not found`, 404);
  return row;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PlanVersionError(`${label} is required`, 422);
  }
  return value.trim().slice(0, 500);
}

export async function listVersions(): Promise<PlanVersionSummary[]> {
  await ensureTables();
  const rows = await pool.query<PlanRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM railopt.planning_runs ORDER BY version DESC LIMIT 50`,
  );
  return rows.rows.map(toSummary);
}

export async function getVersion(runId: string) {
  const row = await loadRow(runId);
  return { ...toSummary(row), plan: row.result };
}

export async function getEvents(runId: string | null) {
  await ensureTables();
  const rows = await pool.query(
    `SELECT event_id AS "eventId", run_id AS "runId", event_type AS "eventType", actor, reason,
            details, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
     FROM railopt.plan_events
     WHERE ($1::text IS NULL OR run_id = $1)
     ORDER BY created_at DESC, event_id DESC
     LIMIT 200`,
    [runId],
  );
  return rows.rows;
}

/** ML priority → CP-SAT, stored as a new DRAFT version. */
export async function createPlan(actorInput: unknown) {
  const actor = typeof actorInput === "string" && actorInput.trim() ? actorInput.trim() : "planner";
  const result = (await generateBlockPlan()) as unknown as PlanResult;
  const summary = await saveVersion(result, "PLAN", actor, null, null, null);
  return { ...summary, plan: result };
}

export async function approveVersion(runId: string, body: Record<string, unknown>) {
  const actor = requireText(body.actor, "Planner name");
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  const row = await loadRow(runId);
  if (row.status !== "DRAFT") {
    throw new PlanVersionError(`Only a DRAFT version can be approved (V${row.version} is ${row.status})`, 409);
  }
  if (!row.validation_passed) {
    throw new PlanVersionError("A plan that failed independent validation cannot be approved", 409);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const superseded = await client.query<{ run_id: string }>(
      `UPDATE railopt.planning_runs SET status = 'SUPERSEDED'
       WHERE status = 'APPROVED' AND run_id <> $1 RETURNING run_id`,
      [runId],
    );
    for (const previous of superseded.rows) {
      await logEvent(previous.run_id, "SUPERSEDED", actor, `Replaced by V${row.version}`, { by: runId }, client);
    }
    await client.query(
      `UPDATE railopt.planning_runs
       SET status = 'APPROVED', decided_by = $2, decision_reason = $3, decided_at = NOW()
       WHERE run_id = $1`,
      [runId, actor, reason],
    );
    await logEvent(runId, "APPROVED", actor, reason, null, client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getVersion(runId).then(({ plan: _plan, ...summary }) => summary);
}

export async function rejectVersion(runId: string, body: Record<string, unknown>) {
  const actor = requireText(body.actor, "Planner name");
  const reason = requireText(body.reason, "A reason");
  const row = await loadRow(runId);
  if (row.status !== "DRAFT") {
    throw new PlanVersionError(`Only a DRAFT version can be rejected (V${row.version} is ${row.status})`, 409);
  }
  await pool.query(
    `UPDATE railopt.planning_runs
     SET status = 'REJECTED', decided_by = $2, decision_reason = $3, decided_at = NOW()
     WHERE run_id = $1`,
    [runId, actor, reason],
  );
  await logEvent(runId, "REJECTED", actor, reason);
  return getVersion(runId).then(({ plan: _plan, ...summary }) => summary);
}

function parseChanges(value: unknown): WhatIfChange[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new PlanVersionError("changes must be an array", 422);
  return value as WhatIfChange[];
}

function parsePins(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PlanVersionError("pins must be an object of task_id → window_id", 422);
  }
  return value as Record<string, string>;
}

async function derive(
  parentRunId: string,
  trigger: "MODIFY" | "REPLAN",
  body: Record<string, unknown>,
) {
  const actor = requireText(body.actor, "Planner name");
  const reason = requireText(body.reason, "A reason");
  const parent = await loadRow(parentRunId);
  const changes = parseChanges(body.changes);
  const pins = trigger === "MODIFY" ? parsePins(body.pins) : {};

  // A version made by replanning keeps its committed past: later
  // modifications inherit its freeze time and a new disruption cannot be
  // earlier than it.
  const parentFreeze =
    typeof parent.trigger_detail?.freezeBefore === "string" ? parent.trigger_detail.freezeBefore : null;

  let freezeBefore: string | null = parentFreeze;
  if (trigger === "REPLAN") {
    if (parent.status !== "APPROVED") {
      throw new PlanVersionError("Emergency replanning starts from the APPROVED plan", 409);
    }
    const time = requireText(body.disruptionTime, "Disruption time");
    if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      throw new PlanVersionError("Disruption time must be YYYY-MM-DD HH:MM", 422);
    }
    freezeBefore = time.replace("T", " ").padEnd(19, ":00").slice(0, 19);
    if (parentFreeze && freezeBefore < parentFreeze) {
      throw new PlanVersionError(
        `Disruption time cannot be before ${parentFreeze.slice(0, 16)}, the freeze time of V${parent.version}`,
        422,
      );
    }
    const horizonEnd = new Date(`${parent.planning_date}T00:00:00Z`);
    horizonEnd.setUTCDate(horizonEnd.getUTCDate() + parent.horizon_days);
    if (freezeBefore.slice(0, 10) < parent.planning_date || freezeBefore.slice(0, 10) >= horizonEnd.toISOString().slice(0, 10)) {
      throw new PlanVersionError("Disruption time must lie inside the planning horizon", 422);
    }
    if (!changes.length) throw new PlanVersionError("Describe at least one disruption", 422);
  } else {
    if (parent.status === "REJECTED" || parent.status === "SUPERSEDED") {
      throw new PlanVersionError(`V${parent.version} is ${parent.status}; modify a DRAFT or the APPROVED plan`, 409);
    }
    if (!changes.length && !Object.keys(pins).length) {
      throw new PlanVersionError("Add at least one change", 422);
    }
  }

  // Earlier disruptions and planner edits stay in force down the version
  // chain: a child re-applies its parent's changes and pins plus its own.
  const parentChanges = Array.isArray(parent.trigger_detail?.changes)
    ? (parent.trigger_detail.changes as WhatIfChange[])
    : [];
  const parentPins = (parent.trigger_detail?.pins ?? {}) as Record<string, string>;
  const seen = new Set<string>();
  const allChanges = [...parentChanges, ...changes].filter((change) => {
    const key = JSON.stringify(change);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const frozenIds = new Set(
    freezeBefore
      ? parent.result.assignments.filter((item) => item.start < freezeBefore!.slice(0, 16)).map((item) => item.task_id)
      : [],
  );
  const startedPin = Object.keys(pins).find((taskId) => frozenIds.has(taskId));
  if (startedPin) {
    throw new PlanVersionError(`${startedPin} started before the freeze time and cannot be moved`, 422);
  }
  const allPins = Object.fromEntries(
    Object.entries({ ...parentPins, ...pins }).filter(([taskId]) => !frozenIds.has(taskId)),
  );

  const result = (await replanFrom({
    previous: parent.result.assignments,
    changes: allChanges,
    freezeBefore,
    pins: allPins,
  })) as unknown as PlanResult;
  if (result.planning_date !== parent.planning_date) {
    throw new PlanVersionError(
      `The planning date changed (${parent.planning_date} → ${result.planning_date}); generate a new plan instead`,
      409,
    );
  }

  const detail = { changes: allChanges, pins: allPins, newChanges: changes, newPins: pins, freezeBefore };
  const summary = await saveVersion(result, trigger, actor, reason, parentRunId, detail);
  await logEvent(parentRunId, trigger === "MODIFY" ? "MODIFIED" : "REPLANNED", actor, reason, {
    newRunId: summary.runId,
    newVersion: summary.version,
  });
  return { ...summary, plan: result };
}

export const modifyVersion = (runId: string, body: Record<string, unknown>) => derive(runId, "MODIFY", body);
export const replanVersion = (runId: string, body: Record<string, unknown>) => derive(runId, "REPLAN", body);
