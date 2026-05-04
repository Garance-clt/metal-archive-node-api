// services/fetchWithCache.ts
import cache from "./cache.js";
import { curlFetchResponse } from "../utils/curlFetch.js";
import { sleep } from "../utils/sleep.js";
import { THROTTLE_MS, TTL_FOREVER } from "../utils/constants.js";

let lastFetch = 0;

const RETRY_DELAYS = [1500, 4000, 8000];

// In-flight requests: if the same URL is already being fetched, return the
// same promise instead of launching a duplicate curl. This means 100 users
// hitting the same uncached page simultaneously only generate 1 request to MA.
const inFlight = new Map<string, Promise<string>>();

// uses curl to bypass Cloudflare TLS fingerprinting; cache + throttle + retry on 5xx
export async function fetchWithCache(
  url: string,
  ttl = TTL_FOREVER
): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  // Coalesce concurrent requests for the same URL
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = _fetch(url, ttl).finally(() => inFlight.delete(url));
  inFlight.set(url, promise);
  return promise;
}

async function _fetch(url: string, ttl: number): Promise<string> {
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

    if (res.status < 500 || attempt >= RETRY_DELAYS.length) break;

    const delay = RETRY_DELAYS[attempt];
    console.warn(`[fetchWithCache] ${res.status} — retry in ${delay}ms (attempt ${attempt + 1}/${RETRY_DELAYS.length})`);
    await sleep(delay);
  }

  throw lastError ?? new Error("Unknown error");
}
