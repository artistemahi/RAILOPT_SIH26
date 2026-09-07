import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get("/dashboard", getDashboard);

export default dashboardRouter;
