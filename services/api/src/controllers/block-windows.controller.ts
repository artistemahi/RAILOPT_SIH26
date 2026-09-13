import type { Request, Response } from "express";
import { getBlockWindowById, getBlockWindows } from "../services/block-windows.service.js";

export async function listBlockWindows(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 100;
    const windows = await getBlockWindows(limit);
    res.json({ success: true, count: windows.length, results: windows });
  } catch (error) {
    console.error("Failed to fetch block windows:", error);
    res.status(500).json({ success: false, error: "Failed to fetch block windows" });
  }
}

export async function getBlockWindow(req: Request, res: Response): Promise<void> {
  try {
    const window = await getBlockWindowById(String(req.params.windowId));
    if (!window) {
      res.status(404).json({ success: false, error: "Block window not found" });
      return;
    }
    res.json({ success: true, result: window });
  } catch (error) {
    console.error("Failed to fetch block window:", error);
    res.status(500).json({ success: false, error: "Failed to fetch block window" });
  }
}
