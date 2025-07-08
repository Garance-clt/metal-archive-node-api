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
    location: txt("Location"),
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
  return $("div#band_tab_discography table.discog tbody tr") // <— +sélecteur plus sûr
    .map((_, tr) => {
      const cells = $(tr).find("td");
      const a = cells.eq(0).find("a");
      return {
        id: a.attr("href")!.match(/(\d+)(?:\D*$)/)![1],
        url: a.attr("href")!,
        title: a.text().trim(),
        type: cells.eq(1).text().trim(),
        year: Number(cells.eq(2).text().trim()),
      };
    })
    .get();
}

function parseMembers($: CheerioAPI): Member[] {
  const members: Member[] = [];

  /** utilitaire commun à chaque onglet */
  const grab = (tabSel: string, status: Member["status"]) => {
    $(`${tabSel} table.lineupTable tr.lineupRow`).each((_, tr) => {
      const row = $(tr);
      const a = row.find("a.bold");
      members.push({
        status,
        name: a.text().trim(),
        url: a.attr("href") ?? "",
        /** ex. "Guitars (1988-1990), Bass (1990)" → espaces normalisés */
        role: row.find("td").eq(1).text().replace(/\s+/g, " ").trim(),
      });
    });
  };

  /* --- onglets explicites --- */
  grab("#band_tab_members_current", "current"); // « Current » ou « Last known »
  grab("#band_tab_members_live", "live");
  grab("#band_tab_members_past", "past");

  /* --- cas extrême : aucun des trois onglets ----
   * (certains groupes très vieux n’ont qu’un « Complete lineup »)
   */
  if (!members.length) {
    $("#band_tab_members_all table.lineupTable").each((_, tbl) => {
      let status: Member["status"] = "past"; // défaut
      $(tbl)
        .prevAll("tr.lineupHeaders") // groupe « Last / Current / Past »
        .first()
        .text()
        .toLowerCase()
        .includes("current")
        ? (status = "current")
        : undefined;

      grab(`#${$(tbl).attr("id")}`, status); // même logique que ci-dessus
    });
  }

  return members;
}
