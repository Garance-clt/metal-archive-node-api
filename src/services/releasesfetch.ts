/**
 * The above TypeScript code defines functions to fetch and parse release details from a specified URL,
 * with caching and throttling mechanisms in place.
 * @param {string} id - The `id` parameter in the `fetchReleaseHtml` and `fetchRelease` functions is a
 * string representing the unique identifier of a release (album) for which you want to fetch
 * information. This identifier is used to construct the URL for fetching the release details and HTML
 * content.
 * @returns The `fetchRelease` function returns a Promise that resolves to a `ReleaseDetails` object.
 */
// services/releaseFetch.ts
import { HEADERS, BASE_URL, THROTTLE_MS } from "../utils/constants.js";
import { sleep } from "../utils/sleep.js";
import cache from "../services/cache.js";
import {
  parseReleasePage,
  type ReleaseDetails,
} from "../parsers/releaseParser.js";

let lastFetch = 0;
// TTL court : la page peut être retouchée souvent (reviews, notes…)
const TTL_MS = 60 * 60 * 1000; // 1h

export async function fetchReleaseHtml(id: string): Promise<string> {
  const cacheKey = `release:${id}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const delta = Date.now() - lastFetch;
  if (delta < THROTTLE_MS) await sleep(THROTTLE_MS - delta);
  lastFetch = Date.now();

  // Tip MA : on peut ignorer les segments "band/album" avec _/_
  const url = `${BASE_URL}/albums/_/_/${id}`;

  console.time(`[releaseFetch] upstream ${id}`);
  const res = await fetch(url, { headers: HEADERS });
  console.timeEnd(`[releaseFetch] upstream ${id}`);

  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);

  const html = await res.text();
  cache.set(cacheKey, html, TTL_MS);
  console.debug(`[releaseFetch] cached ${id} (ttl ${TTL_MS / 1000}s)`);

  return html;
}

export async function fetchRelease(id: string): Promise<ReleaseDetails> {
  const html = await fetchReleaseHtml(id);
  return parseReleasePage(html, `${BASE_URL}/albums/_/_/${id}`);
}
