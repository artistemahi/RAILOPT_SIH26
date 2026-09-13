import { Router } from "express";
import {
  getBlockPlanner,
  optimizeBlockPlanner,
} from "../controllers/block-planner.controller.js";

const blockPlannerRouter = Router();

blockPlannerRouter.get("/planner", getBlockPlanner);
blockPlannerRouter.post("/planner/optimize", optimizeBlockPlanner);

export default blockPlannerRouter;
