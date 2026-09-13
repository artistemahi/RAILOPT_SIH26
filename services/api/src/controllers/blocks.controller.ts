import type { Request, Response } from "express";
import { getBlockById, getBlocks } from "../services/blocks.service.js";

export async function listBlocks(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 50;
    const blocks = await getBlocks(limit);
    res.json({ success: true, count: blocks.length, results: blocks });
  } catch (error) {
    console.error("Failed to fetch blocks:", error);
    res.status(500).json({ success: false, error: "Failed to fetch blocks" });
  }
}

export async function getBlock(req: Request, res: Response): Promise<void> {
  try {
    const block = await getBlockById(String(req.params.blockId));
    if (!block) {
      res.status(404).json({ success: false, error: "Block not found" });
      return;
    }
    res.json({ success: true, result: block });
  } catch (error) {
    console.error("Failed to fetch block:", error);
    res.status(500).json({ success: false, error: "Failed to fetch block" });
  }
}
