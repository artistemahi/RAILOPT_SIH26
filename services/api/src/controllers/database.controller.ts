import type { Request, Response } from "express";
import { pool } from "../config/database.js";

export async function testDatabase(_req: Request, res: Response) {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      connected: true,
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      connected: false,
      error: "Database connection failed",
    });
  }
}