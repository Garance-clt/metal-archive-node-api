import { fetchWithCache } from "./fetchWithCache.js";
import { TTL_FOREVER } from "../utils/constants.js";
export function fetchAlbumHtml(id) {
    return fetchWithCache(`https://www.metal-archives.com/albums/_/_/${id}`, TTL_FOREVER);
}
