import type {
  Backlog,
  BlockWindows,
  DataQuality,
  DataSources,
  Settings,
} from "../types/workspace";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export const getBacklog = () => getJson<Backlog>("/api/backlog");
export const getBlockWindows = () => getJson<BlockWindows>("/api/block-windows");
export const getDataSources = () => getJson<DataSources>("/api/data/sources");
export const getDataQuality = () => getJson<DataQuality>("/api/data/quality");
export const getSettings = () => getJson<Settings>("/api/settings");
