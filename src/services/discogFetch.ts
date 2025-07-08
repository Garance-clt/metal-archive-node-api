import { parseDiscogFragment } from "../parsers/discographyParser.js";
import { fetchWithCache } from "./fetchWithCache.js";

const ROOT = "https://www.metal-archives.com/band/discography/id";
const TTL = 6 * 60 * 60_000; // 6 h dans le cache
export const TABS = ["all", "main", "lives", "demos", "misc"] as const;
export type DiscogTab = (typeof TABS)[number];

export async function fetchDiscogHtml(
  id: string,
  tab: DiscogTab
): Promise<string> {
  const url = `${ROOT}/${id}/tab/${tab}`;
  console.time(`[discog] GET ${tab} ${id}`);
  const html = await fetchWithCache(url, TTL);
  console.timeEnd(`[discog] GET ${tab} ${id}`);
  return html;
}

export async function fetchDiscog(id: string, tab: DiscogTab) {
  const html = await fetchDiscogHtml(id, tab);
  const items = parseDiscogFragment(html);

  console.log(`[discog] «${tab}» ${id} → ${items.length} items`);
  return items; // ← tableau ReleaseSummary[]
}
