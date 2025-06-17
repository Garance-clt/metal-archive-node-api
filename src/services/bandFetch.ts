// services/bandFetch.ts
import { HEADERS, BASE_URL, THROTTLE_MS } from "../utils/constants.js";
import { sleep } from "../utils/sleep.js";
import cache from "../services/cache.js";

let lastFetch = 0;

export async function fetchBandHtml(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return hit;

  const delta = Date.now() - lastFetch;
  if (delta < THROTTLE_MS) await sleep(THROTTLE_MS - delta);
  lastFetch = Date.now();

  const url = `${BASE_URL}/bands/_/${id}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);

  const html = await res.text();
  // Provide a TTL value, e.g., 60 * 1000 for 1 minute
  cache.set(id, html, 60 * 1000);
  return html;
}

export async function fetchDiscogHtml(id: string): Promise<string> {
  const url = `https://www.metal-archives.com/band/discography/id/${id}/tab/all`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Discog upstream ${res.status}`);
  return res.text();
}
