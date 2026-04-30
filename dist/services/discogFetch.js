// services/discogFetch.ts
import { parseDiscogFragment } from "../parsers/discographyParser.js";
import { fetchWithCache } from "./fetchWithCache.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js"; // <-- nouvel import
const ROOT = "https://www.metal-archives.com/band/discography/id";
const TTL = 6 * 60 * 60_000; // 6 h de cache
export const TABS = ["all", "main", "lives", "demos", "misc"];
export async function fetchDiscogHtml(id, tab) {
    return fetchWithCache(`${ROOT}/${id}/tab/${tab}`, TTL);
}
export async function fetchDiscog(id, tab) {
    const html = await fetchDiscogHtml(id, tab);
    return parseDiscogFragment(html).map((item) => ({
        ...item,
        cover: buildCoverUrl(item.id),
    }));
}
