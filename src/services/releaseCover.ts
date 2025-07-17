// services/releaseCover.ts
import cache from "./cache.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import { load } from "cheerio";
import { BASE_URL, HEADERS } from "../utils/constants.js";

const TTL = 24 * 60 * 60_000; // 24 h
const EXT = ["jpg", "png", "jpeg"] as const;

/** Retourne l’URL de la pochette ou null si introuvable */
export async function fetchReleaseCover(id: string): Promise<string | null> {
  const hit = cache.get("cover:" + id);
  if (hit) return hit;

  /* ---------- 1) HEAD direct sur le CDN ---------- */
  for (const ext of EXT) {
    const url = buildCoverUrl(id, ext);
    try {
      const res = await fetch(url, { method: "HEAD", headers: HEADERS });
      if (res.ok) {
        cache.set("cover:" + id, url, TTL);
        return url;
      }
    } catch {
      /* réseau : on continue */
    }
  }

  /* ---------- 2) Fallback scrap HTML (rare) ---------- */
  const htmlUrl = `${BASE_URL}/albums/_/_/${id}`;
  const html = await fetch(htmlUrl, { headers: HEADERS }).then((r) => r.text());
  const $ = load(html);
  const cover =
    $("#cover img").attr("src") ??
    $('meta[property="og:image"]').attr("content") ??
    null;

  if (cover) cache.set("cover:" + id, cover, TTL);
  return cover;
}
