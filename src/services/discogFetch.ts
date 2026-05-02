import { parseDiscogFragment } from "../parsers/discographyParser.js";
import { fetchWithCache } from "./fetchWithCache.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import { TTL_FOREVER } from "../utils/constants.js";
import type { ReleaseSummary } from "../models/Band.js";

const ROOT = "https://www.metal-archives.com/band/discography/id";

export const TABS = ["all", "main", "lives", "demos", "misc"] as const;
export type DiscogTab = (typeof TABS)[number];

export async function fetchDiscogHtml(id: string, tab: DiscogTab): Promise<string> {
  return fetchWithCache(`${ROOT}/${id}/tab/${tab}`, TTL_FOREVER);
}

export async function fetchDiscog(id: string, tab: DiscogTab): Promise<ReleaseSummary[]> {
  const html = await fetchDiscogHtml(id, tab);
  return parseDiscogFragment(html).map((item) => ({
    ...item,
    cover: buildCoverUrl(item.id),
  }));
}
