import type { Request, Response } from "express";
import { getSections } from "../services/sections.service.js";

export async function listSections(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 100;
    const sections = await getSections(limit);
    res.json({ success: true, count: sections.length, results: sections });
  } catch (error) {
    console.error("Failed to fetch sections:", error);
    res.status(500).json({ success: false, error: "Failed to fetch sections" });
  }
}
