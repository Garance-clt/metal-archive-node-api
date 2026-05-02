// services/labelFetch.ts
import { fetchWithCache } from "./fetchWithCache.js";
import cache from "./cache.js";
import { TTL_FOREVER } from "../utils/constants.js";
const BASE = "https://www.metal-archives.com";
const PAGE_SIZE = 500;
export function fetchLabelHtml(id) {
    return fetchWithCache(`${BASE}/labels/_/${id}`, TTL_FOREVER);
}
async function fetchAllPages(urlBase) {
    const url0 = `${urlBase}?sEcho=1&iDisplayStart=0&iDisplayLength=${PAGE_SIZE}`;
    let first;
    try {
        first = JSON.parse(await fetchWithCache(url0, TTL_FOREVER));
    }
    catch {
        cache.delete(url0);
        return [];
    }
    const rows = [...(first.aaData ?? [])];
    const total = first.iTotalRecords ?? rows.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    // Pages suivantes en séquence pour ne pas saturer le throttle
    for (let p = 1; p < pages; p++) {
        const offset = p * PAGE_SIZE;
        const url = `${urlBase}?sEcho=1&iDisplayStart=${offset}&iDisplayLength=${PAGE_SIZE}`;
        const raw = await fetchWithCache(url, TTL_FOREVER);
        let json;
        try {
            json = JSON.parse(raw);
        }
        catch {
            continue;
        }
        if (json.aaData?.length)
            rows.push(...json.aaData);
    }
    return rows;
}
export function fetchLabelRoster(id) {
    return fetchAllPages(`${BASE}/label/ajax-bands/nbrPerPage/${PAGE_SIZE}/id/${id}`);
}
export function fetchLabelPastRoster(id) {
    return fetchAllPages(`${BASE}/label/ajax-bands-past/nbrPerPage/${PAGE_SIZE}/id/${id}`);
}
export function fetchLabelReleases(id) {
    return fetchAllPages(`${BASE}/label/ajax-albums/nbrPerPage/${PAGE_SIZE}/id/${id}`);
}
