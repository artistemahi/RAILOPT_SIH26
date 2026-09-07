import { Router } from "express";
import { getBlockPlanner } from "../controllers/block-planner.controller.js";

const blockPlannerRouter = Router();

blockPlannerRouter.get("/planner", getBlockPlanner);

export default blockPlannerRouter;
