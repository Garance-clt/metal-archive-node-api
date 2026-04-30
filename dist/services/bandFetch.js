// services/bandFetch.ts
import { fetchWithCache } from "./fetchWithCache.js";
const TTL = 60 * 60 * 1000; // 1 h
const BASE = "https://www.metal-archives.com";
export function fetchBandHtml(id) {
    return fetchWithCache(`${BASE}/bands/_/${id}`, TTL);
}
export function fetchBandSimilar(id) {
    return fetchWithCache(`${BASE}/band/ajax-recommendations/id/${id}`, TTL);
}
export function fetchBandLinks(id) {
    return fetchWithCache(`${BASE}/link/ajax-list/type/band/id/${id}`, TTL);
}
