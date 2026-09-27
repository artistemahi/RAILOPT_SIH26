import type { Request, Response } from "express";
import { getNetwork, type NetworkResponse } from "../services/network.service.js";

export async function network(
  _request: Request,
  response: Response<NetworkResponse | { error: string }>,
): Promise<void> {
  try {
    response.status(200).json(await getNetwork());
  } catch (error) {
    console.error("Network query failed:", error);
    response.status(500).json({ error: "Failed to load network data" });
  }
}
