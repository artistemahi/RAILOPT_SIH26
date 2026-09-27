import { Router } from "express";
import {
  approve,
  create,
  events,
  modify,
  plan,
  plans,
  reject,
  replan,
} from "../controllers/plan-versions.controller.js";

const planVersionsRouter = Router();

planVersionsRouter.get("/plans", plans);
planVersionsRouter.post("/plans", create);
planVersionsRouter.get("/plans/events", events);
planVersionsRouter.get("/plans/:runId", plan);
planVersionsRouter.get("/plans/:runId/events", events);
planVersionsRouter.post("/plans/:runId/approve", approve);
planVersionsRouter.post("/plans/:runId/reject", reject);
planVersionsRouter.post("/plans/:runId/modify", modify);
planVersionsRouter.post("/plans/:runId/replan", replan);

export default planVersionsRouter;
