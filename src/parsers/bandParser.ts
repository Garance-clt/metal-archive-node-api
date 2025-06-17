import { load, type CheerioAPI } from "cheerio";
import type { Band, ReleaseSummary, Member } from "../models/Band.js";

export function parseBand(html: string, id: string): Band {
  const $ = load(html);
  const txt = (label: string) =>
    $(`dt:contains("${label}")`).next("dd").text().trim();

  return {
    id,
    name: $("h1.band_name > a").text().trim(),
    country: txt("Country of origin"),
    formed: Number(txt("Formed in")),
    status: txt("Status"),
    genre: txt("Genre"),
    logo: $("#logo img").attr("src") ?? null,
    picture: $("#photo img").attr("src") ?? null,
    releases: parseDiscog($), // ← résumé des albums
    members: parseMembers($),
  };
}

/* -------- Discographie (résumé) -------- */
function parseDiscog($: CheerioAPI): ReleaseSummary[] {
  return $("table.discog tbody tr")
    .map((_, tr) => {
      const row = $(tr); // ligne de la table que l’on traite
      const a = row.find("td").first().find("a");

      const url = a.attr("href")!;
      const id = url.match(/(\d+)(?:\D*$)/)?.[1] ?? "0"; // dernier nombre de l’URL

      return {
        id,
        title: a.text().trim(),
        url,
        type: row.find("td.typeCol").text().trim(), // type de la sortie
        year: Number(row.find("td.yearCol").text().trim()),
      };
    })
    .get();
}

/* -------- Membres -------- */
function parseMembers($: CheerioAPI): Member[] {
  const res: Member[] = [];

  $("#band_members table.lineupTable").each((_, tbl) => {
    const header = $(tbl)
      .prevAll("tr.lineupHeaders")
      .first()
      .text()
      .toLowerCase();
    const status: Member["status"] = header.includes("current")
      ? "current"
      : header.includes("live")
      ? "live"
      : "past";

    $(tbl)
      .find("tr.lineupRow")
      .each((_, tr) => {
        const a = $(tr).find("a.bold");
        res.push({
          name: a.text().trim(),
          url: a.attr("href")!,
          role: $(tr).find("td").eq(1).text().replace(/\s+/g, " ").trim(),
          status,
        });
      });
  });

  return res;
}
