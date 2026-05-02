// services/bandFetch.ts
import { fetchWithCache } from "./fetchWithCache.js";
import { TTL_FOREVER } from "../utils/constants.js";
const BASE = "https://www.metal-archives.com";
export function fetchBandHtml(id) {
    return fetchWithCache(`${BASE}/bands/_/${id}`, TTL_FOREVER);
}
export function fetchBandSimilar(id) {
    return fetchWithCache(`${BASE}/band/ajax-recommendations/id/${id}`, TTL_FOREVER);
}
export function fetchBandLinks(id) {
    return fetchWithCache(`${BASE}/link/ajax-list/type/band/id/${id}`, TTL_FOREVER);
}
