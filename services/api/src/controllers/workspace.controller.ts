import type { Request, Response } from "express";
import {
  getBacklog,
  getBlockWindows,
  getDataQuality,
  getDataSources,
  getSettings,
} from "../services/workspace.service.js";

function handler(name: string, load: () => Promise<unknown>) {
  return async (_request: Request, response: Response): Promise<void> => {
    try {
      response.status(200).json(await load());
    } catch (error) {
      console.error(`${name} query failed:`, error);
      response.status(500).json({ error: `Failed to load ${name}` });
    }
  };
}

export const backlog = handler("backlog", getBacklog);
export const blockWindows = handler("block windows", getBlockWindows);
export const dataSources = handler("data sources", getDataSources);
export const dataQuality = handler("data quality", getDataQuality);
export const settings = handler("settings", getSettings);
