import type { Request, Response } from "express";
import { getConflicts } from "../services/conflicts.service.js";

export async function listConflicts(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 100;
    const conflicts = await getConflicts(limit);
    res.json({ success: true, count: conflicts.length, results: conflicts });
  } catch (error) {
    console.error("Failed to fetch conflicts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch conflicts" });
  }
}
