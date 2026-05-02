// parsers/releaseParser.ts
import { load } from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import pLimit from "p-limit";

export interface ReleaseDetails {
  id: string;
  url: string;
  title: string;
  band: { id: string; name: string; url: string };
  cover?: { thumb?: string; full?: string };
  type?: string;
  releaseDate?: string;
  catalogId?: string;
  versionDesc?: string;
  label?: { id?: string; name: string; url?: string };
  format?: string;
  limitation?: string;
  reviews?: { count: number; avg?: number; url?: string };
  tracklist: Track[];
  lineup: LineupMember[];
  staff: LineupMember[];
  notesHtml?: string;
  otherVersions?: Version[];
  recordingInfoHtml?: string;
  identifiersHtml?: string;
  audit?: {
    addedBy?: string;
    addedOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
  };
}

export type Version = {
  id?: string;
  title?: string | null;
  year?: number | null;
  format?: string | null;
  label?: {
    id?: string | null;
    name?: string | null;
    url?: string | null;
  } | null;
  catalogId?: string | null;
  country?: string | null;
  versionDesc?: string | null;
  notes?: string | null;
};

// parsers/releaseParser.ts (complète Track)
export interface Track {
  index: number;
  title: string;
  duration?: string;
  seconds?: number;
  side?: string;
  hasLyrics?: boolean;
  lyricsId?: string;
  anchorId?: string;

  // ⬇️ ajout pour éviter l'assertion partout
  lyricsHtml?: string;
  lyricsText?: string;
  lyricsStatus?: "ok" | "instrumental" | "unavailable" | "error";
  lyricsError?: string;
}

export interface LineupMember {
  artist?: { id?: string; name: string; url?: string };
  role: string;
  rip?: string;
  section?: "band" | "guest" | "staff";
}
export interface LyricsOptions {
  concurrency?: number; // nb de requêtes parallèles
  asText?: boolean; // si true => remplit aussi lyricsText (br => \n)
  keepHtml?: boolean; // si true => remplit lyricsHtml
  timeoutMs?: number; // timeout par requête
  retry?: number; // nb de retry (429/5xx)
  baseUrl?: string; // pour tests / proxy, défaut = https://www.metal-archives.com/
}

export interface TrackWithLyrics extends Track {
  lyricsHtml?: string;
  lyricsText?: string;
  lyricsStatus?: "ok" | "instrumental" | "unavailable" | "error";
  lyricsError?: string;
}

const trim = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const num = (s: string) => Number((s || "").replace(/[^\d.]/g, "")) || 0;

function secondsFromDuration(d?: string) {
  if (!d) return undefined;
  const m = d.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const mm = parseInt(m[1], 10);
  const ss = parseInt(m[2], 10);
  return mm * 60 + ss;
}

function getDd($: CheerioAPI, dtText: string): string | undefined {
  const dt = $("#album_info dt")
    .filter((_, el) => trim($(el).text()) === dtText)
    .first();
  if (!dt.length) return undefined;
  const dd = dt.next("dd");
  return trim(dd.text());
}

function parseBand($: CheerioAPI) {
  const bandA = $("#album_info h2.band_name a").first();
  const bandUrl = bandA.attr("href") || "";
  const bandId = bandUrl.match(/\/bands\/[^/]+\/(\d+)/)?.[1];
  return {
    id: bandId || "",
    name: trim(bandA.text()),
    url: bandUrl,
  };
}

function parseCover($: CheerioAPI) {
  const a = $("#album_sidebar .album_img a#cover");
  if (!a.length) return undefined;
  const full = a.attr("href") || undefined; // ex: .../415337.jpg?2816
  const img = a.find("img").attr("src") || undefined;
  return { thumb: img, full };
}

function normalizeLyricsId(anchorId?: string) {
  if (!anchorId) return undefined;
  const m = anchorId.match(/^(\d+)[A-Za-z]?$/);
  return m?.[1];
}

function parseTracklist($: CheerioAPI): Track[] {
  const rows = $(
    "#album_tabs_tracklist table.table_lyrics tbody tr, #album_tabs_tracklist table.table_lyrics tr"
  );
  const tracks: Track[] = [];
  let currentSide: string | undefined;

  rows.each((_, tr) => {
    const $tr = $(tr);

    // Lignes "side"
    if ($tr.hasClass("sideRow")) {
      currentSide = trim($tr.find("td").first().text());
      return;
    }

    // Lignes conteneur AJAX des lyrics
    if ($tr.attr("id")?.startsWith("song")) return;

    const tds = $tr.find("td");
    if (tds.length >= 3) {
      // la première cellule contient "n." avec une ancre
      const idxText = trim(tds.eq(0).text()); // "1."
      const index = parseInt(idxText.replace(/\D+/g, ""), 10);

      const title = trim(tds.eq(1).text());
      const duration = trim(tds.eq(2).text()) || undefined;
      const seconds = secondsFromDuration(duration);

      const lyricsA = tds.eq(3).find('a[id^="lyricsButton"]');
      const anchorId = lyricsA.attr("id")?.replace(/^lyricsButton/, "");
      const hasLyrics = !!lyricsA.length;
      const lyricsId = normalizeLyricsId(anchorId);

      if (!isNaN(index) && title) {
        tracks.push({
          index,
          title,
          duration,
          seconds,
          side: currentSide,
          hasLyrics,
          lyricsId,
          anchorId,
        });
      }
    }
  });

  return tracks;
}

const DEFAULT_LYRICS_OPTS: Required<LyricsOptions> = {
  concurrency: 4,
  asText: true,
  keepHtml: true,
  timeoutMs: 15_000,
  retry: 2,
  baseUrl: "https://www.metal-archives.com/",
};

function buildLyricsUrl(id: string | number, baseUrl: string) {
  const numeric = String(id).replace(/[^\d]/g, "");
  return `${baseUrl.replace(
    /\/+$/,
    ""
  )}/release/ajax-view-lyrics/id/${numeric}`;
}

function htmlToText(html: string) {
  // on garde la ponctuation basique, transforme <br> en \n et vire le reste
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .trim();
}

function isInstrumentalPayload(s: string) {
  // Metal Archives renvoie souvent "Instrumental" (avec ou sans balises)
  return /\binstrumental\b/i.test(s);
}
function isUnavailablePayload(s: string) {
  // parfois "No lyrics available", "Lyrics not available", etc.
  return /(no\s+lyrics\s+available|lyrics\s+not\s+available)/i.test(s);
}

export async function attachLyricsToTracks(
  tracks: TrackWithLyrics[],
  fetcher: (
    url: string,
    init?: { signal?: AbortSignal }
  ) => Promise<{
    ok: boolean;
    status: number;
    text: () => Promise<string>;
  }>,
  opts: LyricsOptions = {}
) {
  const opt = { ...DEFAULT_LYRICS_OPTS, ...opts };
  const limit = pLimit(opt.concurrency);

  const tasks = tracks
    .filter((t) => !!t.lyricsId)
    .map((t) =>
      limit(async () => {
        const url = buildLyricsUrl(t.lyricsId!, opt.baseUrl);
        let attempt = 0;

        while (true) {
          attempt++;
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), opt.timeoutMs);

          try {
            const res = await fetcher(url, { signal: ctrl.signal });
            clearTimeout(to);

            if (!res.ok) {
              if (
                (res.status === 429 || res.status >= 500) &&
                attempt <= opt.retry + 1
              ) {
                await new Promise((r) => setTimeout(r, 250 * attempt));
                continue;
              }
              t.lyricsStatus = "error";
              t.lyricsError = `HTTP ${res.status}`;
              return;
            }

            const payload = (await res.text()).trim();
            if (isInstrumentalPayload(payload)) {
              t.lyricsStatus = "instrumental";
              if (opt.keepHtml) t.lyricsHtml = "Instrumental";
              if (opt.asText) t.lyricsText = "Instrumental";
              return;
            }
            if (isUnavailablePayload(payload)) {
              t.lyricsStatus = "unavailable";
              return;
            }

            t.lyricsStatus = "ok";
            if (opt.keepHtml) t.lyricsHtml = payload;
            if (opt.asText) t.lyricsText = htmlToText(payload);
            return;
          } catch (err: any) {
            clearTimeout(to);
            if (attempt <= opt.retry + 1) {
              await new Promise((r) => setTimeout(r, 250 * attempt));
              continue;
            }
            t.lyricsStatus = "error";
            t.lyricsError = err?.message || String(err);
            return;
          }
        }
      })
    );

  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.warn(`[releaseParser] ${failed}/${tasks.length} lyrics tasks failed`);
}

function parseLineupTables($: CheerioAPI) {
  const candidates = [
    "#album_all_members_lineup .lineupTable",
    "#album_members_lineup .lineupTable",
    "#album_members_misc .lineupTable",
    "#album_members .lineupTable",
    "#album_tabs_lineup .lineupTable",
  ];

  let tables: ReturnType<CheerioAPI> | undefined;
  for (const sel of candidates) {
    const found = $(sel);
    if (found.length) {
      tables = found;
      break;
    }
  }

  const band: LineupMember[] = [];
  const staff: LineupMember[] = [];
  const guest: LineupMember[] = [];
  if (!tables || !tables.length) {
    return { band, staff };
  }

  tables.each((_, el) => {
    const $tbl = $(el);
    let currentSection: "band" | "staff" | "guest" | undefined;

    const parentId = $tbl.closest("div[id]").attr("id") || "";

    if (/guest/i.test(parentId)) currentSection = "guest";
    else if (/misc/i.test(parentId)) currentSection = "staff";
    else if (
      /members_lineup|members$/i.test(parentId) ||
      /all_members/i.test(parentId)
    )
      currentSection = "band";
    $tbl.find("tr").each((__, row) => {
      const $tr = $(row);

      if ($tr.hasClass("lineupHeaders")) {
        const title = ($tr.find("td").last().text() || "").trim().toLowerCase();
        if (/guest|session/.test(title)) currentSection = "guest";
        else if (/misc|staff/.test(title)) currentSection = "staff";
        else if (/band/.test(title) || /original line-up/.test(title))
          currentSection = "band";
        // sinon on conserve currentSection tel quel
        return;
      }

      if ($tr.hasClass("lineupRow")) {
        const tds = $tr.find("td");
        const tdArtist = tds.eq(0);
        const tdRole = tds.eq(1);

        const a = tdArtist.find("a").first();
        const name = trim(a.text());
        const url = a.attr("href");
        const id = url?.match(/\/artists\/[^/]+\/(\d+)/)?.[1];

        const rip =
          tdArtist
            .clone()
            .children("a")
            .remove()
            .end()
            .text()
            .match(/\(R\.I\.P\.[^)]+\)/)?.[0] || undefined;

        const role = trim(tdRole.text());

        const entry: LineupMember = {
          artist: name ? { id, name, url } : undefined,
          role,
          rip,
          section: currentSection,
        };

        if ((currentSection ?? "band") === "staff") {
          staff.push(entry);
        } else if (currentSection === "guest") {
          guest.push(entry);
        } else {
          band.push(entry);
        }
      }
    });
  });

  console.debug(
    "[lineup] total band :",
    band.length,
    "total staff :",
    staff.length,
    "total guest :",
    guest.length
  );
  return { band, staff, guest };
}

function parseReviews($: CheerioAPI) {
  const dd = $("#album_info dd")
    .filter((_, el) => /reviews/i.test($(el).prev().text()))
    .first();
  if (!dd.length) return undefined;

  const text = trim(dd.text()); // "28 reviews (avg. 96%)"
  const count = num(text);
  const avgMatch = text.match(/avg\.\s*([\d.]+)%/i);
  const url = dd.find("a").attr("href") || undefined;

  return { count, avg: avgMatch ? Number(avgMatch[1]) : undefined, url };
}

function parseNotesAndIds($: CheerioAPI) {
  const notesWrap = $("#album_tabs_notes .ui-tabs-panel-content");
  if (!notesWrap.length)
    return { notesHtml: undefined, recHtml: undefined, idsHtml: undefined };

  const ps = notesWrap.children("p");
  const notesHtml = ps.eq(0).html() || undefined;

  const recTitle = notesWrap
    .find("p.title_comment")
    .filter((_, el) => /Recording information/i.test($(el).text()))
    .first();
  const recHtml = recTitle.length
    ? recTitle.next("p").html() || undefined
    : undefined;

  const idTitle = notesWrap
    .find("p.title_comment")
    .filter((_, el) => /Identifiers/i.test($(el).text()))
    .first();
  const idsHtml = idTitle.length
    ? idTitle.next("p").html() || undefined
    : undefined;

  return { notesHtml, recHtml, idsHtml };
}

function parseAudit($: CheerioAPI) {
  const rows = $("#auditTrail table tr");
  const addedBy = trim(rows.eq(0).find("td").eq(0).text()).replace(
    /^Added by:\s*/i,
    ""
  );
  const modifiedBy = trim(rows.eq(0).find("td").eq(1).text()).replace(
    /^Modified by:\s*/i,
    ""
  );
  const addedOn = trim(rows.eq(1).find("td").eq(0).text()).replace(
    /^Added on:\s*/i,
    ""
  );
  const modifiedOn = trim(rows.eq(1).find("td").eq(1).text()).replace(
    /^Last modified on:\s*/i,
    ""
  );

  return {
    addedBy: addedBy || undefined,
    addedOn: addedOn || undefined,
    modifiedBy: modifiedBy || undefined,
    modifiedOn: modifiedOn || undefined,
  };
}

// parsers/releaseParser.ts (à la suite)
function buildVersionsUrl(
  releaseId: string | number,
  parentId?: string | number,
  base = "https://www.metal-archives.com/"
) {
  const id = String(releaseId).replace(/[^\d]/g, "");
  const parent = String(parentId ?? releaseId).replace(/[^\d]/g, "");
  return `${base.replace(
    /\/+$/,
    ""
  )}/release/ajax-versions/current/${id}/parent/${parent}`;
}

export async function fetchOtherVersions(
  releaseId: string,
  fetcher: (
    url: string,
    init?: { signal?: AbortSignal }
  ) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>,
  opts?: { parentId?: string; baseUrl?: string; timeoutMs?: number }
): Promise<Version[]> {
  const url = buildVersionsUrl(releaseId, opts?.parentId, opts?.baseUrl);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 15000);
  try {
    const res = await fetcher(url, { signal: ctrl.signal });
    if (!res.ok) return [];
    const html = await res.text();
    return parseOtherVersionsHtml(html);
  } finally {
    clearTimeout(to);
  }
}

// --- util: normalise un header en clé canonique
function normHeader(h: string) {
  const s = h.toLowerCase().replace(/\s+/g, " ").trim();
  if (/^year$|date/.test(s)) return "year";
  if (/^title$|release/.test(s)) return "title";
  if (/^format/.test(s)) return "format";
  if (/^label/.test(s)) return "label";
  if (/cat/.test(s)) return "cat";
  if (/country/.test(s)) return "country";
  if (/version|desc/.test(s)) return "versionDesc";
  if (/notes?/.test(s)) return "notes";
  if (/type/.test(s)) return "type";
  return s;
}

export function parseOtherVersionsHtml(html: string): Version[] {
  const $ = load(html);
  const table = $("table.display").first();
  if (!table.length) return [];

  // map des colonnes par header
  const headers = table
    .find("thead th")
    .map((_, th) => $(th).text().trim())
    .get();
  const map: Record<string, number> = {};
  headers.forEach((h, i) => (map[normHeader(h)] = i));

  const rows = table.find("tbody tr");
  const out: Version[] = [];

  rows.each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.find("td");
    if (!tds.length) return;

    // helpers
    const at = (key: string) => {
      const i = map[key];
      return i == null ? "" : (tds.eq(i).text() || "").trim();
    };
    const cell = (key: string) => {
      const i = map[key];
      return i == null ? $() : tds.eq(i);
    };

    // id de la version (href album)
    const aRelease = $tr.find('a[href*="/albums/"]').first();
    const id = aRelease
      .attr("href")
      ?.match(/\/albums\/[^/]+\/[^/]+\/(\d+)/)?.[1];

    // titre (si colonne dédiée, sinon texte du lien)
    const title =
      (map["title"] != null ? at("title") : aRelease.text().trim()) || null;

    // label
    const aLabel = $tr.find('a[href*="/labels/"]').first();
    const label = aLabel.length
      ? {
          id: aLabel.attr("href")?.match(/\/labels\/[^/]+\/(\d+)/)?.[1] ?? null,
          name: aLabel.text().trim() || null,
          url: aLabel.attr("href") || null,
        }
      : at("label")
      ? { name: at("label") }
      : null;

    const format = at("format") || null;
    const catalogId = at("cat") || null;
    const country = at("country") || null;
    const notes = at("notes") || null;
    const versionDesc = at("versionDesc") || null;

    const yraw = at("year");
    const year = yraw ? Number((yraw.match(/\d{4}/) || [])[0]) || null : null;

    out.push({
      id,
      title,
      year,
      format,
      label,
      catalogId,
      country,
      versionDesc,
      notes,
    });
  });

  // tri par (year asc, label asc, format asc)
  out.sort(
    (a, b) =>
      (a.year ?? 0) - (b.year ?? 0) ||
      (a.label?.name ?? "").localeCompare(b.label?.name ?? "") ||
      (a.format ?? "").localeCompare(b.format ?? "")
  );
  return out;
}

export function parseReleasePage(html: string, pageUrl = ""): ReleaseDetails {
  const $ = load(html);

  const canonicalA =
    $("#album_info h1.album_name a").attr("href") || pageUrl || "";
  const releaseId =
    canonicalA.match(/\/albums\/[^/]+\/[^/]+\/(\d+)/)?.[1] ||
    $("#album_sidebar .album_img a#cover")
      .attr("href")
      // tolère un querystring (…jpg?2816)
      ?.match(/\/images\/(?:\d+\/){4}(\d+)\.jpg(?:\?.*)?$/)?.[1] ||
    "";

  const title = trim($("#album_info h1.album_name").text());
  const band = parseBand($);
  const cover = parseCover($);

  const type = getDd($, "Type:");
  const releaseDate = getDd($, "Release date:");
  const catalogId = getDd($, "Catalog ID:");
  const versionDesc = getDd($, "Version desc.:");

  const labelDd = $("#album_info dt")
    .filter((_, el) => trim($(el).text()) === "Label:")
    .first()
    .next("dd");
  const labelA = labelDd.find("a").first();
  const label = labelDd.length
    ? {
        id: labelA.attr("href")?.match(/\/labels\/[^/]+\/(\d+)/)?.[1],
        name: trim(labelA.text()) || trim(labelDd.text()),
        url: labelA.attr("href") || undefined,
      }
    : undefined;

  const format = getDd($, "Format:");
  const limitation = getDd($, "Limitation:");

  const reviews = parseReviews($);
  const tracklist = parseTracklist($);
  const { band: bandMembers, staff, guest = [] } = parseLineupTables($);
  const lineup = [...bandMembers, ...guest];

  const { notesHtml, recHtml, idsHtml } = parseNotesAndIds($);
  const audit = parseAudit($);

  return {
    id: releaseId,
    url: pageUrl || canonicalA,
    title,
    band,
    cover,
    type,
    releaseDate,
    catalogId,
    versionDesc,
    label,
    format,
    limitation,
    reviews,
    tracklist,
    lineup,
    staff,
    notesHtml,
    recordingInfoHtml: recHtml,
    identifiersHtml: idsHtml,
    audit,
  };
}
