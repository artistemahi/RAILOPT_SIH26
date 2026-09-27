import type { NetworkData } from "../types/network";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

export async function getNetwork(): Promise<NetworkData> {
  const response = await fetch(`${apiBaseUrl}/api/network`);
  if (!response.ok) {
    throw new Error(`Network API returned HTTP ${response.status}`);
  }
  return (await response.json()) as NetworkData;
}
