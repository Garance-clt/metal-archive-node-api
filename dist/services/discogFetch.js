import { parseDiscogFragment } from "../parsers/discographyParser.js";
import { fetchWithCache } from "./fetchWithCache.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import { TTL_FOREVER } from "../utils/constants.js";
const ROOT = "https://www.metal-archives.com/band/discography/id";
export const TABS = ["all", "main", "lives", "demos", "misc"];
export async function fetchDiscogHtml(id, tab) {
    return fetchWithCache(`${ROOT}/${id}/tab/${tab}`, TTL_FOREVER);
}
export async function fetchDiscog(id, tab) {
    const html = await fetchDiscogHtml(id, tab);
    return parseDiscogFragment(html).map((item) => ({
        ...item,
        cover: buildCoverUrl(item.id),
    }));
}
