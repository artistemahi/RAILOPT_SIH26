import { Router } from "express";
import { listSections } from "../controllers/sections.controller.js";

const router = Router();
router.get("/", listSections);

export default router;
