import { Router } from "express";
import {
  backlog,
  blockWindows,
  dataQuality,
  dataSources,
  settings,
} from "../controllers/workspace.controller.js";

const workspaceRouter = Router();

workspaceRouter.get("/backlog", backlog);
workspaceRouter.get("/block-windows", blockWindows);
workspaceRouter.get("/data/sources", dataSources);
workspaceRouter.get("/data/quality", dataQuality);
workspaceRouter.get("/settings", settings);

export default workspaceRouter;
