/* parsers/artistParser.ts */
import { load, type CheerioAPI } from "cheerio";
import type * as cheerio from "cheerio";
import type { Artist } from "../models/Artist.js";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import type { StatusCode } from "hono/utils/http-status";
import type { AnyNode } from "domhandler";
/* -------------------- Helpers généraux -------------------- */
function stripOrdinals(s: string) {
  return s.replace(/\b(\d+)(st|nd|rd|th)\b/gi, "$1");
}

function toISODate(raw: string | null) {
  if (!raw) return null;
  const cleaned = stripOrdinals(raw).replace(/\s+/g, " ").trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function cleanRoleToken(txt: string) {
  return txt
    .replace(/\(as\s+"[^"]+"\)/gi, "")
    .replace(/\(track[s]?\s*[^)]+\)/gi, "")
    .replace(/\((?:lead|backing|solo|live|.*?)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Transforme un fragment HTML en texte pur, sans emails, sans liens */
function htmlToPlainText(rawHtml: string): string {
  const $ = load(`<div id="root">${rawHtml}</div>`);
  const $root = $("#root");

  // 1) Supprime emails (Cloudflare + mailto:)
  $root.find("span.__cf_email__").remove();
  $root.find('a[href^="mailto:"]').remove();

  // 2) <a> -> texte
  $root.find("a").each((_, el) => {
    const a = $(el);
    a.replaceWith(a.text());
  });

  // 3) <br> -> \n
  $root.find("br").replaceWith("\n");

  // 4) vire les toolstrips/boutons
  $root.find(".tool_strip, .btn_read_more").remove();

  // 5) texte + normalisation
  let text = $root.text();
  text = text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // 6) pas d’emails ni "Contact:" orphelin
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const filtered = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !EMAIL_RE.test(l) && !/^contact\s*:?\s*$/i.test(l));

  return filtered.join("\n").trim();
}

/* -------------------- Read-more (endpoint AJAX) -------------------- */
export function parseArtistReadMore(html: string): string {
  const $ = load(html);
  $('a[href^="mailto:"]').remove();
  $("span.__cf_email__").remove();
  $("br").replaceWith("\n");

  let text = $.root().text().trim();
  text = text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const filtered = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !EMAIL_RE.test(l) && !/^contact\s*:?\s*$/i.test(l));

  return filtered.join("\n").trim();
}

/* -------------------- Extraction des sections Bio/Trivia -------------------- */
function grabSectionTextAndReadMore(
  $: CheerioAPI,
  title: "Biography" | "Trivia"
) {
  const $scope = $("#member_info .band_comment");
  const $h2 = $scope.find(`h2.title_comment:contains("${title}")`).first();
  if (!$h2.length)
    return { text: null as string | null, readMoreUrl: null as string | null };

  // --- Collect *all* sibling nodes (elements + text) until next H2 ---
  const wrap = $("<div/>");
  // @ts-ignore – access underlying node
  let node: any = $h2[0]?.nextSibling;
  while (node) {
    // stop at the next <h2 class="title_comment">
    if (
      node.type === "tag" &&
      node.name === "h2" &&
      $(node).hasClass("title_comment")
    ) {
      break;
    }
    wrap.append($(node).clone());
    node = node.nextSibling;
  }

  // Find read-more inside this fragment (only present for Biography)
  const _$ = load(`<div id="frag">${wrap.html() ?? ""}</div>`);
  const onclick = _$("#frag .btn_read_more").attr("onclick") ?? "";
  const idMatch = onclick.match(/read-more\/id\/(\d+)/);
  const readMoreUrl = idMatch
    ? `https://www.metal-archives.com/artist/read-more/id/${idMatch[1]}`
    : null;

  // Remove toolstrip before getting plain text
  _$("#frag .tool_strip, #frag .btn_read_more").remove();

  // Turn the cleaned fragment into plain text (keeps spaces, handles <br>)
  const html = _$("#frag").html() || "";
  const text = html ? htmlToPlainText(html) : null;

  return { text, readMoreUrl };
}

/* -------------------- Bands/contributions -------------------- */

const TRACK_RANGE_RE = /\btracks?\s+(\d+)(?:\s*-\s*(\d+))?/i;
const SINGLE_TRACK_RE = /\btrack\s+(\d+)\b/i;

function getBandId(
  $scope: cheerio.CheerioAPI,
  el: cheerio.Cheerio<AnyNode>
): string {
  const $block = $scope(el);
  const href = $block.find("h3.member_in_band_name a").attr("href") ?? "";
  const fromHref = href.match(/\/(\d+)(?:#|$)/)?.[1];
  if (fromHref) return fromHref;
  const idAttr = $block.attr("id") || "";
  const fromIdAttr = idAttr.match(/memberInBand_(?:l_)?(\d+)/)?.[1];
  return fromIdAttr ?? "0";
}

function extractContributionsForBandBlock(
  $scope: cheerio.CheerioAPI,
  $block: cheerio.Cheerio<AnyNode>
) {
  const rows = $block.find("table.display tr");
  if (!rows.length) return [];
  const list: Array<{
    releaseId: string;
    title: string;
    year: number | null;
    type: string | null;
    cover: string | null;
    roleSummary: string | null;
    tracks: Array<{
      trackNo?: number | null;
      title: string;
      role?: string | null;
    }>;
  }> = [];

  rows.each((_, tr) => {
    const $tr = $scope(tr);
    const tds = $tr.find("td");

    const yearTxt = tds.eq(0).text().trim();
    const year = Number(yearTxt) || null;

    const cell2 = tds.eq(1);
    const link = cell2.find("a").first();
    const title = link.text().trim();
    const href = link.attr("href") || "";
    const releaseId = href.match(/\/albums\/[^/]+\/[^/]+\/(\d+)/)?.[1] ?? "";

    const afterText = cell2.clone().children("a").remove().end().text().trim();
    const type = (afterText.match(/\(([^)]+)\)/)?.[1] || "").trim() || null;

    const roleRaw = tds.eq(2).text().replace(/\s+/g, " ").trim() || null;

    const tracks: Array<{
      trackNo?: number | null;
      title: string;
      role?: string | null;
    }> = [];
    if (roleRaw) {
      const mRange = roleRaw.match(TRACK_RANGE_RE);
      const mSingle = roleRaw.match(SINGLE_TRACK_RE);
      if (mRange) {
        const a = Number(mRange[1]);
        const b = Number(mRange[2]);
        if (!isNaN(a)) {
          const last = !isNaN(b) ? b : a;
          for (let n = a; n <= last; n++)
            tracks.push({ trackNo: n, title: "", role: roleRaw });
        }
      } else if (mSingle) {
        const n = Number(mSingle[1]);
        if (!isNaN(n)) tracks.push({ trackNo: n, title: "", role: roleRaw });
      }
    }

    const cover =
      releaseId && /^\d+$/.test(releaseId) ? buildCoverUrl(releaseId) : null;

    list.push({
      releaseId,
      title,
      year,
      type,
      cover,
      roleSummary: roleRaw,
      tracks,
    });
  });

  return list;
}

/* -------------------- Parser principal artiste -------------------- */

export function parseArtist(html: string, id: string): Artist {
  const $ = load(html);

  const pick = (label: string) =>
    $(`dt:contains("${label}")`).next("dd").text().trim() || null;

  // Photo
  const photo =
    $("#member_sidebar a.image#artist").attr("href") ??
    $("#member_sidebar #artist").attr("href") ??
    $("#artist_sidebar #photo").attr("href") ??
    null;

  // Identité
  const ageLine = pick("Age:") ?? "";
  const age = ageLine.match(/^\s*(\d+)\b/)?.[1] ? Number(RegExp.$1) : null;
  const bornRaw = ageLine.match(/\(born ([^)]+)\)/i)?.[1] ?? null;
  const born = bornRaw;
  const bornISO = toISODate(bornRaw);
  const diedRaw =
    pick("R.I.P.") ?? ageLine.match(/R\.I\.P\.\s*:\s*([^()]+)/i)?.[1] ?? null;
  const died = diedRaw?.trim() || null;
  const diedISO = toISODate(died);
  const diedOf = pick("Died of") ?? null;

  // Sections Overview
  const { text: bio, readMoreUrl: bioReadMoreUrl } = grabSectionTextAndReadMore(
    $,
    "Biography"
  );
  const { text: trivia, readMoreUrl: triviaReadMoreUrl } =
    grabSectionTextAndReadMore($, "Trivia");

  // Bands
  type Status = "current" | "past" | "live" | "guest" | "misc";
  const statuses: Record<string, Status> = {
    artist_tab_active: "current",
    artist_tab_past: "past",
    artist_tab_live: "live",
    artist_tab_guest: "guest",
    artist_tab_misc: "misc",
  };

  const bands: Artist["bands"] = [];
  Object.entries(statuses).forEach(([tabId, status]) => {
    $(`#${tabId} .member_in_band`).each((_, div) => {
      const bandBlock = $(div);
      const h3 = bandBlock.find("h3.member_in_band_name").first();
      const a = h3.find("a");
      const bandName = (a.length ? a.text() : h3.text()).trim();
      const url = a.attr("href") ?? null;
      const bandId = getBandId($, $(div));

      const pRole = bandBlock.find("p.member_in_band_role").first();
      const aliasContext =
        pRole
          .html()
          ?.match(/As\s+([^:<]+)\s*:/i)?.[1]
          ?.trim() ?? null;

      let role = pRole.find("strong").text().trim();
      if (!role) {
        const raw = bandBlock
          .find("table.display tr")
          .map((_, tr) => $(tr).find("td").last().text().trim())
          .get();
        const tokens = raw
          .join(",")
          .split(",")
          .map((s) => cleanRoleToken(s))
          .filter(Boolean);
        role = [...new Set(tokens)].join(", ");
      } else {
        role = cleanRoleToken(role);
      }

      let years = pRole
        .contents()
        .filter((_, el) => (el as any).type === "text")
        .text()
        .replace(/[()]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!years) {
        const allYears = bandBlock
          .find('table.display td[width="28"]')
          .map((_, td) => Number($(td).text().trim()))
          .get()
          .filter(Boolean)
          .sort((a, b) => a - b);
        if (allYears.length) {
          const first = allYears[0];
          const last = allYears[allYears.length - 1];
          years = first === last ? `${first}` : `${first}-${last}`;
        }
      }

      const contributions = extractContributionsForBandBlock($, bandBlock);
      bands.push({
        bandId,
        bandName,
        url,
        role,
        status,
        years,
        aliasContext,
        contributions,
      });
    });
  });

  const pobText = pick("Place of birth:") ?? pick("Country of origin:") ?? null;

  return {
    id,
    name: $("h1.band_member_name").text().trim(),
    realName: pick("Real/full name:"),
    country: pobText?.split("(")[0].trim() || null,
    birthCity: pobText?.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null,
    gender: (pick("Gender:") as Artist["gender"]) ?? null,

    age,
    born,
    bornISO,
    died,
    diedISO,
    diedOf,

    photo,

    // Texte pur + URLs "read more"
    bio,
    trivia,
    bioReadMoreUrl,
    triviaReadMoreUrl,

    aliases: $("#artist_aliases li")
      .map((_, li) => $(li).text().trim())
      .get(),

    bands,
  };
}
