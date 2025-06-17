import { load } from "cheerio";
import { fetchWithCache } from "./fetchWithCache.js";

const TTL = 12 * 60 * 60 * 1_000; // 12 h ­– tu peux ajuster

/* ---------- Typage des résultats ---------- */
export type Result =
  | {
      type: "band";
      id: string;
      name: string;
      country: string | null;
      genre: string;
    }
  | {
      type: "artist";
      id: string;
      name: string;
      realName: string | null;
      country: string | null;
    }
  | { type: "album"; id: string; title: string; band: string; year: number }
  | {
      type: "song";
      id: string;
      title: string;
      band: string;
      album: string;
      year: number;
    };

/* ---------- Recherche générique ---------- */
export async function siteSearch(q: string): Promise<Result[]> {
  const encoded = encodeURIComponent(q);

  const endpoints = {
    band: `https://www.metal-archives.com/search/ajax-band-search/?field=name&query=${encoded}`,
    artist: `https://www.metal-archives.com/search/ajax-artist-search/?field=alias&query=${encoded}`,
    album: `https://www.metal-archives.com/search/ajax-album-search/?field=title&query=${encoded}`,
    song: `https://www.metal-archives.com/search/ajax-song-search/?field=title&query=${encoded}`,
  };

  // 1. appels parallèles
  const [bandsJ, artistsJ, albumsJ, songsJ] = await Promise.all(
    Object.values(endpoints).map((u) => fetchWithCache(u, TTL))
  ).then((raw) => raw.map((text) => JSON.parse(text)));

  // 2. parsing spécifique
  return [
    ...parseBandResults(bandsJ),
    ...parseArtistResults(artistsJ),
    ...parseAlbumResults(albumsJ),
    ...parseSongResults(songsJ),
  ];
}

/* ---------- Parseurs ---------- */
function parseBandResults(json: any): Result[] {
  return json.aaData.map((row: string[]): Result => {
    // row[0] = '<a href="https://www.metal-archives.com/bands/Entombed/414">Entombed</a>'
    const $a = load(row[0])("a");
    const url = $a.attr("href")!;
    const id = url.match(/\/(\d+)$/)![1];

    const countryTd = load(row[2]).text().trim(); // drapeau + nom
    return {
      type: "band",
      id,
      name: $a.text().trim(),
      genre: row[1].trim(),
      country: countryTd || null,
    };
  });
}

function parseArtistResults(json: any): Result[] {
  return json.aaData.map((row: string[]): Result => {
    // [0] pseudo + lien | [1] vrai nom | [2] pays
    const $a = load(row[0])("a");
    const url = $a.attr("href")!;
    const id = url.match(/\/(\d+)$/)![1];

    return {
      type: "artist",
      id,
      name: $a.text().trim(),
      realName: row[1].trim() || null,
      country: load(row[2]).text().trim() || null,
    };
  });
}

function parseAlbumResults(json: any): Result[] {
  return json.aaData.map((row: string[]): Result => {
    // [0] titre + lien | [1] groupe + lien | [2] année
    const $titleA = load(row[0])("a");
    const albumUrl = $titleA.attr("href")!;
    const id = albumUrl.match(/\/(\d+)$/)![1];

    return {
      type: "album",
      id,
      title: $titleA.text().trim(),
      band: load(row[1])("a").text().trim(),
      year: Number(row[2]) || 0,
    };
  });
}

function parseSongResults(json: any): Result[] {
  return json.aaData.map((row: string[]): Result => {
    // [0] titre + lien | [1] band + lien | [2] album + lien | [3] année
    const $songA = load(row[0])("a");
    const songUrl = $songA.attr("href")!;
    const id = songUrl.match(/\/(\d+)$/)![1];

    return {
      type: "song",
      id,
      title: $songA.text().trim(),
      band: load(row[1])("a").text().trim(),
      album: load(row[2])("a").text().trim(),
      year: Number(row[3]) || 0,
    };
  });
}
