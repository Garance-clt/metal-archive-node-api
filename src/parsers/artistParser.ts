/* parsers/artistParser.ts */
import { load } from "cheerio";
import type { Artist } from "../models/Artist.js";

export function parseArtist(html: string, id: string): Artist {
  const $ = load(html);

  /* -------- utilitaire dt/dd -------- */
  const pick = (label: string) =>
    $(`dt:contains("${label}")`).next("dd").text().trim() || null;

  /* -------- photo -------- */
  const photo =
    $("#member_sidebar #artist").attr("href") ??
    $("#artist_sidebar #photo").attr("href") ??
    null;

  /* -------- identité -------- */
  const ageLine = pick("Age:") ?? ""; // « 25 (born Mar 22nd 1968) »
  const born = ageLine.match(/\(born ([^)]+)\)/i)?.[1] ?? null;

  // R.I.P. / date de mort (si présent)
  const died =
    pick("R.I.P.") ?? // <dt>R.I.P.:</dt><dd>…</dd>
    ageLine.match(/R\.I\.P\.\s*:\s*([^()]+)/i)?.[1] ??
    null;

  // cause de décès éventuelle
  const diedOf = pick("Died of") ?? null;

  /* -------- bio / trivia -------- */
  function grabSection(title: "Biography" | "Trivia") {
    const container = $(`h2.title_comment:contains("${title}")`).parent();
    if (!container.length) return null;
    const txt = container
      .clone()
      .children("h2, .tool_strip")
      .remove()
      .end()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    return txt || null;
  }

  const bio = grabSection("Biography");
  const trivia = grabSection("Trivia");

  /* -------- groupes -------- */
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

      /* --- id / nom / url --- */
      const h3 = bandBlock.find("h3.member_in_band_name").first();
      const a = h3.find("a");
      const bandName = (a.length ? a.text() : h3.text()).trim();
      const url = a.attr("href") ?? null;
      const bandId = url?.match(/\/(\d+)(?:#|$)/)?.[1] ?? "0";

      /* --- rôle & période --- */

      const pRole = bandBlock.find("p.member_in_band_role").first();
      let role = pRole.find("strong").text().trim();

      if (!role) {
        // dans chaque ligne de la table : [année] [album] [rôle(s)]
        const raw = bandBlock
          .find("table.display tr") // toutes les lignes
          .map((_, tr) => $(tr).find("td").last().text().trim()) // dernière <td>
          .get();

        const unique = [
          ...new Set(
            raw
              .join(",")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          ),
        ];

        role = unique.join(", ");
      }

      let years = pRole
        .contents()
        .filter((_, el) => el.type === "text")
        .text()
        .replace(/[()]/g, "")
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

      bands.push({ bandId, bandName, url, role, status, years });
    });
  });

  /* -------- résultat -------- */
  return {
    id,
    name: $("h1.band_member_name").text().trim(),
    realName: pick("Real/full name:"),
    country:
      (pick("Place of birth:") ?? pick("Country of origin:") ?? null)
        ?.split("(")[0]
        ?.trim() || null,
    gender: (pick("Gender:") as Artist["gender"]) ?? null,

    born,
    died,
    diedOf,

    photo,
    bio,
    trivia,

    aliases: $("#artist_aliases li")
      .map((_, li) => $(li).text().trim())
      .get(),

    bands,
  };
}
