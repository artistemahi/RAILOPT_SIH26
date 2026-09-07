import { Router } from "express";
import { getRisk } from "../controllers/risk.controller.js";

const riskRouter = Router();

riskRouter.get("/risk", getRisk);

export default riskRouter;
