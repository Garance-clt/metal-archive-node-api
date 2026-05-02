import { fetchWithCache } from "./fetchWithCache.js";
import { load } from "cheerio";
import { buildLogoUrl } from "../utils/buildLogoUrl.js";
import { buildLabelLogoUrl } from "../utils/buildLabelLogoUrl.js";
import { TTL_FOREVER, TTL_LIVE } from "../utils/constants.js";
const BASE = "https://www.metal-archives.com";
function parseAnchor(html) {
    const $ = load(html);
    const a = $("a[href]").first();
    const href = a.attr("href") ?? "";
    const id = href.match(/\/(\d+)(?:[^0-9]|$)/)?.[1] ?? null;
    return id ? { id, name: a.text().trim() } : null;
}
export async function fetchUpcomingReleases() {
    const url = `${BASE}/release/ajax-upcoming/json/1?sEcho=1&iDisplayStart=0&iDisplayLength=20`;
    const raw = await fetchWithCache(url, TTL_LIVE);
    let json;
    try {
        json = JSON.parse(raw);
    }
    catch {
        return [];
    }
    const rows = json.aaData ?? [];
    return rows.flatMap((r) => {
        const band = parseAnchor(r[0] ?? "");
        const album = parseAnchor(r[1] ?? "");
        if (!band || !album)
            return [];
        return [{
                bandId: band.id,
                bandName: band.name,
                albumId: album.id,
                albumTitle: album.name,
                type: (r[2] ?? "").trim(),
                genre: (r[3] ?? "").trim(),
                releaseDate: (r[4] ?? "").trim(),
            }];
    });
}
export async function fetchLatestAdditions() {
    const [homepageRaw, labelsRaw] = await Promise.all([
        fetchWithCache(`${BASE}/`, TTL_LIVE),
        fetchWithCache(`${BASE}/index/latest-labels`, TTL_LIVE),
    ]);
    const $home = load(homepageRaw);
    const bands = [];
    $home("#additionBands table tr").each((_, row) => {
        const cells = $home(row).find("td");
        const a = $home(cells.get(0)).find("a[href*='/bands/']").first();
        const href = a.attr("href") ?? "";
        const id = href.match(/\/bands\/[^/]+\/(\d+)/)?.[1];
        const name = a.text().trim();
        const addedAt = $home(cells.get(1)).text().trim();
        if (id && name)
            bands.push({ id, name, addedAt, logo: buildLogoUrl(id) });
    });
    const $labels = load(labelsRaw);
    const labels = [];
    $labels("table tr").each((_, row) => {
        const cells = $labels(row).find("td");
        const a = $labels(cells.get(0)).find("a[href*='/labels/']").first();
        const href = a.attr("href") ?? "";
        const id = href.match(/\/labels\/[^/]+\/(\d+)/)?.[1];
        const name = a.text().trim();
        const addedAt = $labels(cells.get(1)).text().trim();
        if (id && name)
            labels.push({ id, name, addedAt, logo: buildLabelLogoUrl(id) });
    });
    return { bands: bands.slice(0, 20), labels: labels.slice(0, 20) };
}
export async function fetchBandsByCountry(country) {
    const url = `${BASE}/search/ajax-advanced/searching/bands/` +
        `?bandName=&genre=&country=${encodeURIComponent(country)}` +
        `&provinceState=&status=&themes=&bandNotes=` +
        `&iDisplayStart=0&iDisplayLength=200&sEcho=1`;
    const raw = await fetchWithCache(url, TTL_FOREVER);
    let json;
    try {
        json = JSON.parse(raw);
    }
    catch {
        return { total: 0, bands: [] };
    }
    const total = json.iTotalRecords ?? 0;
    const rows = json.aaData ?? [];
    const bands = rows.flatMap((r) => {
        const anchor = parseAnchor(r[0] ?? "");
        if (!anchor)
            return [];
        return [{
                id: anchor.id,
                name: anchor.name,
                genre: (r[1] ?? "").replace(/\s+/g, " ").trim(),
                location: load(r[2] ?? "").text().trim(),
                year: (r[3] ?? "").trim(),
                logo: buildLogoUrl(anchor.id),
            }];
    });
    return { total, bands };
}
