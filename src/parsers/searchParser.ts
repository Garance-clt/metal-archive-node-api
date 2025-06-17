import { load } from "cheerio";

export type SearchItem = {
  type: "band" | "artist";
  id: string;
  name: string;
  country?: string;
};

export function parseSearch(html: string): SearchItem[] {
  const $ = load(html);
  const rows = $("table.searchResults tr");
  const out: SearchItem[] = [];
  rows.each((_, tr) => {
    const cells = $(tr).find("td");
    if (!cells.length) return; // skip header
    const link = cells.eq(0).find("a");
    const url = link.attr("href")!;
    const name = link.text().trim();
    let id = "0",
      type: "band" | "artist" = "band";
    if (url.includes("/bands/")) {
      type = "band";
      id = url.split("/").pop()!.split("#")[0];
    }
    if (url.includes("/artists/")) {
      type = "artist";
      id = url.split("/").pop()!.split("#")[0];
    }
    out.push({ type, id, name, country: cells.eq(1).text().trim() });
  });
  return out;
}
