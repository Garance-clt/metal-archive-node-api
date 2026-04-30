// services/fetchWithCache.ts
import cache from "./cache.js";
import { curlFetch } from "../utils/curlFetch.js";
import { sleep } from "../utils/sleep.js";
import { THROTTLE_MS } from "../utils/constants.js";
let lastFetch = 0;
/**
 * Récupère une page HTML avec cache mémoire + throttle (3 s).
 * Utilise curl en interne pour contourner le TLS fingerprinting Cloudflare.
 * @param url  URL absolue Metal-Archives
 * @param ttl  Durée de vie en ms (défaut : 24 h)
 */
export async function fetchWithCache(url, ttl = 24 * 60 * 60 * 1000) {
    const cached = cache.get(url);
    if (cached)
        return cached;
    const delta = Date.now() - lastFetch;
    if (delta < THROTTLE_MS)
        await sleep(THROTTLE_MS - delta);
    lastFetch = Date.now();
    const html = await curlFetch(url);
    cache.set(url, html, ttl);
    return html;
}
