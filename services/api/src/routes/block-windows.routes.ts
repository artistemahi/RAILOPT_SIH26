import { Router } from "express";
import { getBlockWindow, listBlockWindows } from "../controllers/block-windows.controller.js";

const router = Router();
router.get("/", listBlockWindows);
router.get("/:windowId", getBlockWindow);

export default router;
