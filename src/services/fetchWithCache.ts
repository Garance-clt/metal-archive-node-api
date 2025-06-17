// services/fetchWithCache.ts
import cache from "./cache.js";

/** pause utilitaire */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** on ré-utilise la même UA pour limiter Cloudflare  */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** throttle global (au niveau process) */
let lastFetch = 0;

/**
 * Récupère une page HTML avec cache mémoire + throttle (3 s)
 * @param url  URL absolue Metal-Archives
 * @param ttl  Durée de vie en ms (défaut : 24 h)
 */
export async function fetchWithCache(
  url: string,
  ttl = 24 * 60 * 60 * 1000 // 1 jour
): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached; // ✅  hit

  const delta = Date.now() - lastFetch; // throttle 3 s
  if (delta < 3000) await sleep(3000 - delta);
  lastFetch = Date.now();

  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });

  if (!res.ok) throw new Error(`Upstream status ${res.status}`);

  const html = await res.text();
  cache.set(url, html, ttl); // ♻️  enregistre
  return html;
}
