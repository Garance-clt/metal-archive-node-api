/* ------------------------------------------------------------------
 *  Metal-Archives « lazy search » – bands & artists immédiats,
 *  albums / songs au clic.  Logs détaillés + pagination paral­lélisée
 * ----------------------------------------------------------------- */

import { load } from "cheerio";
import pLimit from "p-limit";
import { fetchWithCache } from "./fetchWithCache.js";

/* --------- réglages généraux --------- */
const TTL = 6 * 60 * 60_000; // 6 h de cache
const PAGE = 500; // max accepté par l’API
const MAX_HITS = 600; // stop DL quand assez (songs)
const CONCURRENCY = 6; // appels parallèles
const LIMIT_ROWS = 5_000; // sécurité anti-boucle infinie
const ROOT = "https://www.metal-archives.com/search";

const limit = pLimit(CONCURRENCY);

/* ------------ types de résultats ------------ */
export type BandResult = {
  type: "band";
  id: string;
  name: string;
  country: string | null;
  genre: string;
};
export type ArtistResult = {
  type: "artist";
  id: string;
  name: string;
  realName: string | null;
  country: string | null;
};
export type AlbumResult = {
  type: "album";
  id: string;
  title: string;
  band: string;
  year: number;
};
export type SongResult = {
  type: "song";
  id: string;
  title: string;
  band: string;
  album: string;
  year: number;
};

export type Result = BandResult | ArtistResult | AlbumResult | SongResult;

/* --------------------------------------------------------------
 *  getRows – télécharge *toutes* les pages JSON pour un “kind”.
 *  • 1ʳᵉ page → total → génération du reste.
 *  • appels parallèles limités (p-limit).
 *  • early-exit pour ‘song’ quand MAX_HITS atteint.
 * ------------------------------------------------------------- */
async function getRows(
  base: string,
  kind: "band" | "artist" | "album" | "song"
): Promise<any[]> {
  console.time(`[${kind}] fetch`);
  const rows: any[] = [];

  /* ---- page 0 ---- */
  const url0 = `${base}&iDisplayStart=0&iDisplayLength=${PAGE}&sEcho=1`;
  const first = JSON.parse(await fetchWithCache(url0, TTL));
  if (first.aaData?.length) rows.push(...first.aaData);

  const total = first.iTotalRecords ?? rows.length;
  const pages = Math.min(Math.ceil(total / PAGE), Math.ceil(LIMIT_ROWS / PAGE));

  const tasks: Promise<void>[] = [];
  for (let p = 1; p < pages; p++) {
    const offset = p * PAGE;
    const url = `${base}&iDisplayStart=${offset}&iDisplayLength=${PAGE}&sEcho=1`;

    tasks.push(
      limit(async () => {
        const json = JSON.parse(await fetchWithCache(url, TTL));
        if (json.aaData?.length) rows.push(...json.aaData);
      })
    );
  }

  for (const t of tasks) {
    await t;
    if (kind === "song" && rows.length >= MAX_HITS) break; // early-exit
  }

  console.timeEnd(`[${kind}] fetch`);
  console.log(`   ↳ ${rows.length} raw rows (${kind})`);
  return rows;
}

/* ------------ petit utilitaire <a href> ------------ */
const pickAnchor = (cell: string) => {
  const $a = load(cell)("a[href]");
  const id = $a.attr("href")?.match(/\/(\d+)(?:$|#)/)?.[1];
  return id ? { id, txt: $a.text().trim() } : null;
};

/* ---------------- parseurs publics ---------------- */
export async function searchBands(q: string): Promise<BandResult[]> {
  console.time(`[bands] "${q}"`);
  const rows = await getRows(
    `${ROOT}/ajax-band-search/?field=name&query=${encodeURIComponent(q)}`,
    "band"
  );
  const out = rows.flatMap((r) => {
    const a = pickAnchor(r[0]);
    if (!a) return [];
    return [
      {
        type: "band",
        id: a.id,
        name: a.txt,
        genre: r[1].trim(),
        country: load(r[2]).text().trim() || null,
      },
    ];
  });
  console.timeEnd(`[bands] "${q}"`);
  console.log(`   ↳ ${out.length} bands trouvés`);
  return out;
}

export async function searchArtists(q: string): Promise<ArtistResult[]> {
  console.time(`[artists] "${q}"`);
  const rows = await getRows(
    `${ROOT}/ajax-artist-search/?field=alias&query=${encodeURIComponent(q)}`,
    "artist"
  );
  const out = rows.flatMap((r) => {
    const a = pickAnchor(r[0]);
    if (!a) return [];
    return [
      {
        type: "artist",
        id: a.id,
        name: a.txt,
        realName: r[1].trim() || null,
        country: load(r[2]).text().trim() || null,
      },
    ];
  });
  console.timeEnd(`[artists] "${q}"`);
  console.log(`   ↳ ${out.length} artists trouvés`);
  return out;
}

export async function searchAlbums(q: string): Promise<AlbumResult[]> {
  console.time(`[albums] "${q}"`);
  const rows = await getRows(
    `${ROOT}/ajax-album-search/?field=title&query=${encodeURIComponent(q)}`,
    "album"
  );
  const qL = q.toLowerCase();
  const out = rows.flatMap((r) => {
    const a = pickAnchor(r[0]);
    if (!a || !a.txt.toLowerCase().includes(qL)) return [];
    return [
      {
        type: "album",
        id: a.id,
        title: a.txt,
        band: load(r[1])("a").text().trim(),
        year: Number(r[2]) || 0,
      },
    ];
  });
  console.timeEnd(`[albums] "${q}"`);
  console.log(`   ↳ ${out.length} albums trouvés`);
  return out;
}

export async function searchSongs(q: string): Promise<SongResult[]> {
  console.time(`[songs] "${q}"`);
  const rows = await getRows(
    `${ROOT}/ajax-song-search/?field=title&query=${encodeURIComponent(q)}`,
    "song"
  );
  const qL = q.toLowerCase();
  const out = rows.flatMap((r) => {
    const a = pickAnchor(r[0]);
    if (!a || !a.txt.toLowerCase().includes(qL)) return [];
    return [
      {
        type: "song",
        id: a.id,
        title: a.txt,
        band: load(r[1])("a").text().trim(),
        album: load(r[2])("a").text().trim(),
        year: Number(r[3]) || 0,
      },
    ];
  });
  console.timeEnd(`[songs] "${q}"`);
  console.log(`   ↳ ${out.length} songs trouvés (≤ ${MAX_HITS})`);
  return out;
}
