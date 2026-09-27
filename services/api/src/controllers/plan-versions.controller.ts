import type { Request, Response } from "express";
import { PythonServiceError } from "../integrations/python-service.client.js";
import {
  PlanVersionError,
  approveVersion,
  createPlan,
  getEvents,
  getVersion,
  listVersions,
  modifyVersion,
  rejectVersion,
  replanVersion,
} from "../services/plan-versions.service.js";

function handle(name: string, run: (request: Request) => Promise<unknown>, created = false) {
  return async (request: Request, response: Response): Promise<void> => {
    try {
      response.status(created ? 201 : 200).json(await run(request));
    } catch (error) {
      if (error instanceof PlanVersionError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof PythonServiceError) {
        response
          .status(error.statusCode === 422 ? 422 : 502)
          .json({ error: error.detail ?? `${name} failed: optimizer unavailable` });
        return;
      }
      console.error(`${name} failed:`, error);
      response.status(500).json({ error: `${name} failed` });
    }
  };
}

const runId = (request: Request) => String(request.params.runId);
const body = (request: Request) => (request.body ?? {}) as Record<string, unknown>;

export const plans = handle("Listing plan versions", () => listVersions());
export const plan = handle("Loading plan version", (request) => getVersion(runId(request)));
export const events = handle("Loading plan events", (request) =>
  getEvents(request.params.runId ? runId(request) : null),
);
export const create = handle("Block planning", (request) => createPlan(body(request).actor), true);
export const approve = handle("Approval", (request) => approveVersion(runId(request), body(request)));
export const reject = handle("Rejection", (request) => rejectVersion(runId(request), body(request)));
export const modify = handle("Modification", (request) => modifyVersion(runId(request), body(request)), true);
export const replan = handle("Replanning", (request) => replanVersion(runId(request), body(request)), true);
