import { fetchWithCache } from "./fetchWithCache.js";
const TTL = 24 * 60 * 60 * 1000; // 1 jour
export function fetchArtistHtml(id) {
    // convention « _/id » comme pour les bands/albums
    return fetchWithCache(`https://www.metal-archives.com/artists/_/${id}`, TTL);
}
