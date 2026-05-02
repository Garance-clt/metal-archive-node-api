import { load } from "cheerio";
import pLimit from "p-limit";
import { fetchWithCache } from "./fetchWithCache.js";
import cache from "./cache.js";
import { buildLogoUrl } from "../utils/buildLogoUrl.js";
import { buildLabelLogoUrl } from "../utils/buildLabelLogoUrl.js";
import { TTL_FOREVER } from "../utils/constants.js";
const PAGE = 500; // max accepté par l’API
const MAX_HITS = 600; // stop DL quand assez (songs)
const CONCURRENCY = 6; // appels parallèles
const LIMIT_ROWS = 5_000; // sécurité anti-boucle infinie
const ROOT = "https://www.metal-archives.com/search";
const limit = pLimit(CONCURRENCY);
async function getRows(base, kind) {
    const rows = [];
    const url0 = `${base}&iDisplayStart=0&iDisplayLength=${PAGE}&sEcho=1`;
    let first;
    try {
        first = JSON.parse(await fetchWithCache(url0, TTL_FOREVER));
    }
    catch {
        // MA a retourné du HTML (rate-limit, Cloudflare) — invalider le cache pour le prochain appel
        cache.delete(url0);
        return [];
    }
    if (first.aaData?.length)
        rows.push(...first.aaData);
    const total = first.iTotalRecords ?? rows.length;
    const pages = Math.min(Math.ceil(total / PAGE), Math.ceil(LIMIT_ROWS / PAGE));
    const tasks = [];
    for (let p = 1; p < pages; p++) {
        const offset = p * PAGE;
        const url = `${base}&iDisplayStart=${offset}&iDisplayLength=${PAGE}&sEcho=1`;
        tasks.push(limit(async () => {
            let json;
            try {
                json = JSON.parse(await fetchWithCache(url, TTL_FOREVER));
            }
            catch {
                return;
            } // ignore invalid JSON pages
            if (json.aaData?.length)
                rows.push(...json.aaData);
        }));
    }
    await Promise.all(tasks);
    return rows;
}
const pickAnchor = (cell) => {
    const $a = load(cell)("a[href]");
    const id = $a.attr("href")?.match(/\/(\d+)(?:$|#)/)?.[1];
    return id ? { id, txt: $a.text().trim() } : null;
};
export async function searchBands(q) {
    const rows = await getRows(`${ROOT}/ajax-band-search/?field=name&query=${encodeURIComponent(q)}`, "band");
    return rows.flatMap((r) => {
        const a = pickAnchor(r[0]);
        if (!a)
            return [];
        return [{ type: "band", id: a.id, name: a.txt, genre: r[1].trim(), country: load(r[2]).text().trim() || null, logo: buildLogoUrl(a.id) }];
    });
}
export async function searchArtists(q) {
    const rows = await getRows(`${ROOT}/ajax-artist-search/?field=alias&query=${encodeURIComponent(q)}`, "artist");
    return rows.flatMap((r) => {
        const a = pickAnchor(r[0]);
        if (!a)
            return [];
        return [{ type: "artist", id: a.id, name: a.txt, realName: r[1].trim() || null, country: load(r[2]).text().trim() || null }];
    });
}
export async function searchAlbums(q) {
    const rows = await getRows(`${ROOT}/ajax-album-search/?field=title&query=${encodeURIComponent(q)}`, "album");
    const qL = q.toLowerCase();
    return rows.flatMap((r) => {
        const a = pickAnchor(r[0]);
        if (!a || !a.txt.toLowerCase().includes(qL))
            return [];
        return [{ type: "album", id: a.id, title: a.txt, band: load(r[1])("a").text().trim(), year: Number(r[2]) || 0 }];
    });
}
export async function searchSongs(q) {
    const rows = await getRows(`${ROOT}/ajax-song-search/?field=title&query=${encodeURIComponent(q)}`, "song");
    const qL = q.toLowerCase();
    return rows.flatMap((r) => {
        const a = pickAnchor(r[0]);
        if (!a || !a.txt.toLowerCase().includes(qL))
            return [];
        return [{ type: "song", id: a.id, title: a.txt, band: load(r[1])("a").text().trim(), album: load(r[2])("a").text().trim(), year: Number(r[3]) || 0 }];
    });
}
export async function searchLabels(q) {
    const rows = await getRows(`${ROOT}/ajax-label-search/?field=name&query=${encodeURIComponent(q)}`, "band" // même type de pagination
    );
    return rows.flatMap((r) => {
        const a = pickAnchor(r[0]);
        if (!a)
            return [];
        return [{
                type: "label",
                id: a.id,
                name: a.txt,
                country: load(r[1]).text().trim() || null,
                specialties: load(r[2]).text().trim() || null,
                logo: buildLabelLogoUrl(a.id),
            }];
    });
}
