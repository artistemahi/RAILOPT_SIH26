import { Router } from "express";

import {
  getTask,
  listTasks,
} from "../controllers/tasks.controller.js";

const router = Router();

router.get("/", listTasks);
router.get("/:taskId", getTask);

export default router;