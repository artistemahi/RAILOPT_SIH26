import { Router } from "express";
import { getAsset, listAssets } from "../controllers/assets.controller.js";

const router = Router();
router.get("/", listAssets);
router.get("/:assetId", getAsset);

export default router;
