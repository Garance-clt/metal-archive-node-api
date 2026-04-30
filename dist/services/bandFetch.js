// services/bandFetch.ts
import { fetchWithCache } from "./fetchWithCache.js";
const TTL = 60 * 60 * 1000; // 1 h
const BASE = "https://www.metal-archives.com/bands/_";
export function fetchBandHtml(id) {
    return fetchWithCache(`${BASE}/${id}`, TTL);
}
