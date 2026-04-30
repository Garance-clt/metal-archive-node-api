// services/releaseCover.ts
import cache from "./cache.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import { load } from "cheerio";
import { BASE_URL } from "../utils/constants.js";
import { curlFetch } from "../utils/curlFetch.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const TTL = 24 * 60 * 60_000; // 24 h
const EXT = ["jpg", "png", "jpeg"] as const;

/** Retourne l'URL de la pochette ou null si introuvable */
export async function fetchReleaseCover(id: string): Promise<string | null> {
  const hit = cache.get("cover:" + id);
  if (hit) return hit;

  /* ---------- 1) HEAD direct sur le CDN ---------- */
  for (const ext of EXT) {
    const url = buildCoverUrl(id, ext);
    try {
      const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" --head "${url}"`);
      if (stdout.trim() === "200") {
        cache.set("cover:" + id, url, TTL);
        return url;
      }
    } catch {
      // réseau : on continue
    }
  }

  /* ---------- 2) Fallback scrap HTML (rare) ---------- */
  try {
    const html = await curlFetch(`${BASE_URL}/albums/_/_/${id}`);
    const $ = load(html);
    const cover =
      $("#cover img").attr("src") ??
      $('meta[property="og:image"]').attr("content") ??
      null;
    if (cover) cache.set("cover:" + id, cover, TTL);
    return cover;
  } catch {
    return null;
  }
}
