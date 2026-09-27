import { Router } from "express";
import {
  getBlockPlanner,
  optimizeBlockPlanner,
  planBlocks,
  whatIf,
  whatIfOptions,
} from "../controllers/block-planner.controller.js";

const blockPlannerRouter = Router();

blockPlannerRouter.get("/planner", getBlockPlanner);
blockPlannerRouter.post("/planner/optimize", optimizeBlockPlanner);
blockPlannerRouter.post("/planner/plan-blocks", planBlocks);
blockPlannerRouter.get("/planner/what-if/options", whatIfOptions);
blockPlannerRouter.post("/planner/what-if", whatIf);

export default blockPlannerRouter;
