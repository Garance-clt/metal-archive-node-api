import { fetchWithCache } from "./fetchWithCache.js";
const TTL_ALBUM = 24 * 60 * 60 * 1000; // 1 jour
export function fetchAlbumHtml(id) {
    return fetchWithCache(`https://www.metal-archives.com/albums/_/_/${id}`, // ← 2 underscores
    TTL_ALBUM);
}
