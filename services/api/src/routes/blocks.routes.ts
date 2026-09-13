import { Router } from "express";
import { getBlock, listBlocks } from "../controllers/blocks.controller.js";

const router = Router();
router.get("/", listBlocks);
router.get("/:blockId", getBlock);

export default router;
