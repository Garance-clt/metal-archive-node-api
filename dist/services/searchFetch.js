/* ------------------------------------------------------------------
 *  Metal-Archives « lazy search » – bands & artists immédiats,
 *  albums / songs au clic.  Logs détaillés + pagination paral­lélisée
 * ----------------------------------------------------------------- */
import { load } from "cheerio";
import pLimit from "p-limit";
import { fetchWithCache } from "./fetchWithCache.js";
import { buildLogoUrl } from "../utils/buildLogoUrl.js";
/* --------- réglages généraux --------- */
const TTL = 6 * 60 * 60_000; // 6 h de cache
const PAGE = 500; // max accepté par l’API
const MAX_HITS = 600; // stop DL quand assez (songs)
const CONCURRENCY = 6; // appels parallèles
const LIMIT_ROWS = 5_000; // sécurité anti-boucle infinie
const ROOT = "https://www.metal-archives.com/search";
const limit = pLimit(CONCURRENCY);
/* --------------------------------------------------------------
 *  getRows – télécharge *toutes* les pages JSON pour un “kind”.
 *  • 1ʳᵉ page → total → génération du reste.
 *  • appels parallèles limités (p-limit).
 *  • early-exit pour ‘song’ quand MAX_HITS atteint.
 * ------------------------------------------------------------- */
async function getRows(base, kind) {
    const rows = [];
    const url0 = `${base}&iDisplayStart=0&iDisplayLength=${PAGE}&sEcho=1`;
    const first = JSON.parse(await fetchWithCache(url0, TTL));
    if (first.aaData?.length)
        rows.push(...first.aaData);
    const total = first.iTotalRecords ?? rows.length;
    const pages = Math.min(Math.ceil(total / PAGE), Math.ceil(LIMIT_ROWS / PAGE));
    const tasks = [];
    for (let p = 1; p < pages; p++) {
        const offset = p * PAGE;
        const url = `${base}&iDisplayStart=${offset}&iDisplayLength=${PAGE}&sEcho=1`;
        tasks.push(limit(async () => {
            const json = JSON.parse(await fetchWithCache(url, TTL));
            if (json.aaData?.length)
                rows.push(...json.aaData);
        }));
    }
    for (const t of tasks) {
        await t;
        if (kind === "song" && rows.length >= MAX_HITS)
            break;
    }
    return rows;
}
/* ------------ petit utilitaire <a href> ------------ */
const pickAnchor = (cell) => {
    const $a = load(cell)("a[href]");
    const id = $a.attr("href")?.match(/\/(\d+)(?:$|#)/)?.[1];
    return id ? { id, txt: $a.text().trim() } : null;
};
/* ---------------- parseurs publics ---------------- */
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
        // r[0] peut contenir "Name (a.k.a. Alias)" — on garde le nom propre de l'ancre
        return [{
                type: "label",
                id: a.id,
                name: a.txt,
                country: load(r[1]).text().trim() || null,
                specialties: load(r[2]).text().trim() || null,
            }];
    });
}
