import { fetchWithCache } from "./fetchWithCache.js";
import { TTL_FOREVER } from "../utils/constants.js";
export function fetchArtistHtml(id) {
    return fetchWithCache(`https://www.metal-archives.com/artists/_/${id}`, TTL_FOREVER);
}
