import { Router } from "express";
import {
  getBlockPlanner,
  optimizeBlockPlanner,
  planBlocks,
} from "../controllers/block-planner.controller.js";

const blockPlannerRouter = Router();

blockPlannerRouter.get("/planner", getBlockPlanner);
blockPlannerRouter.post("/planner/optimize", optimizeBlockPlanner);
blockPlannerRouter.post("/planner/plan-blocks", planBlocks);

export default blockPlannerRouter;
