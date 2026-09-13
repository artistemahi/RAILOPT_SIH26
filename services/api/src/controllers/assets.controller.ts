import type { Request, Response } from "express";
import { getAssetById, getAssets } from "../services/assets.service.js";

export async function listAssets(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 50;
    const assets = await getAssets(limit);
    res.json({ success: true, count: assets.length, results: assets });
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    res.status(500).json({ success: false, error: "Failed to fetch assets" });
  }
}

export async function getAsset(req: Request, res: Response): Promise<void> {
  try {
    const asset = await getAssetById(String(req.params.assetId));
    if (!asset) {
      res.status(404).json({ success: false, error: "Asset not found" });
      return;
    }
    res.json({ success: true, result: asset });
  } catch (error) {
    console.error("Failed to fetch asset:", error);
    res.status(500).json({ success: false, error: "Failed to fetch asset" });
  }
}
