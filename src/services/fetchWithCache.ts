// services/fetchWithCache.ts
import cache from "./cache.js";
import { curlFetchResponse } from "../utils/curlFetch.js";
import { sleep } from "../utils/sleep.js";
import { THROTTLE_MS, TTL_FOREVER } from "../utils/constants.js";

let lastFetch = 0;

const RETRY_DELAYS = [1500, 4000, 8000]; // délais entre retries en ms

// uses curl to bypass Cloudflare TLS fingerprinting; cache + throttle + retry on 5xx
export async function fetchWithCache(
  url: string,
  ttl = TTL_FOREVER
): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const delta = Date.now() - lastFetch;
    if (delta < THROTTLE_MS) await sleep(THROTTLE_MS - delta);
    lastFetch = Date.now();

    const res = await curlFetchResponse(url);

    if (res.ok) {
      const html = await res.text();
      cache.set(url, html, ttl);
      return html;
    }

    lastError = new Error(`Upstream status ${res.status}`);

    // Retry uniquement sur les erreurs 5xx (transitoires)
    if (res.status < 500 || attempt >= RETRY_DELAYS.length) break;

    const delay = RETRY_DELAYS[attempt];
    console.warn(`[fetchWithCache] ${res.status} sur ${url} — retry dans ${delay}ms (tentative ${attempt + 1}/${RETRY_DELAYS.length})`);
    await sleep(delay);
  }

  throw lastError ?? new Error("Erreur inconnue");
}
