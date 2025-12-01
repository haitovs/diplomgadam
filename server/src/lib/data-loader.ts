import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Restaurant, InsightMetric, CuisineDemand } from "../types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../..");
const dataDir = path.join(repoRoot, "data");

const memoryCache = new Map<string, unknown>();

function loadJson<T>(fileName: string): T {
  if (memoryCache.has(fileName)) {
    return memoryCache.get(fileName) as T;
  }
  const targetPath = path.join(dataDir, fileName);
  const raw = readFileSync(targetPath, "utf-8");
  const parsed = JSON.parse(raw) as T;
  memoryCache.set(fileName, parsed);
  return parsed;
}

export function loadRestaurants(): Restaurant[] {
  return loadJson<Restaurant[]>("restaurants.json");
}

export function findRestaurant(id: string) {
  return loadRestaurants().find((restaurant) => restaurant.id === id);
}

export function loadInsightMetrics() {
  return loadJson<InsightMetric[]>("insights-metrics.json");
}

export function loadCuisineDemand() {
  return loadJson<CuisineDemand[]>("cuisine-demand.json");
}
