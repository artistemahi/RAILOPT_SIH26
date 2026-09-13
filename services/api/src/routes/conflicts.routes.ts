import { Router } from "express";
import { listConflicts } from "../controllers/conflicts.controller.js";

const router = Router();
router.get("/", listConflicts);

export default router;
