// services/releaseCover.ts
import cache from "./cache.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import { load } from "cheerio";
import { BASE_URL } from "../utils/constants.js";
import { curlFetch } from "../utils/curlFetch.js";
import { execFile } from "child_process";
import { promisify } from "util";
const execFileAsync = promisify(execFile);
import { TTL_FOREVER } from "../utils/constants.js";
const EXT = ["jpg", "jpeg", "png", "gif"];
export async function fetchReleaseCover(id) {
    const hit = cache.get("cover:" + id);
    if (hit)
        return hit;
    for (const ext of EXT) {
        const url = buildCoverUrl(id, ext);
        try {
            const { stdout } = await execFileAsync("curl", [
                "-s", "-o", "/dev/null", "-w", "%{http_code}", "--head", url,
            ]);
            if (stdout.trim() === "200") {
                cache.set("cover:" + id, url, TTL_FOREVER);
                return url;
            }
        }
        catch {
        }
    }
    try {
        const html = await curlFetch(`${BASE_URL}/albums/_/_/${id}`);
        const $ = load(html);
        const cover = $("#cover img").attr("src") ??
            $('meta[property="og:image"]').attr("content") ??
            null;
        if (cover)
            cache.set("cover:" + id, cover, TTL_FOREVER);
        return cover;
    }
    catch {
        return null;
    }
}
