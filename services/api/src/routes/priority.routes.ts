import { Router } from "express";

import {
  getPriorities,
  getPriorityByTaskId,
  predictPriority,
} from "../controllers/priority.controller.js";

const router = Router();

router.post("/predict", predictPriority);

router.get("/", getPriorities);

router.get("/:taskId", getPriorityByTaskId);

export default router;