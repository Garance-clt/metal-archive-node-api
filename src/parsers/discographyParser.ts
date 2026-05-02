// parsers/discogParser.ts
import { load } from "cheerio";
import type { ReleaseSummary } from "../models/Band.js";

export function parseDiscogFragment(html: string): ReleaseSummary[] {
  const $ = load(html);

  return $("table.discog tbody tr")
    .map((_, tr) => {
      const cells = $(tr).find("td");
      const a = cells.eq(0).find("a");

      const url = a.attr("href")!;
      const id = url.match(/(\d+)(?:\D*$)/)?.[1] ?? "0";

      return {
        id,
        title: a.text().trim(),
        url,
        type: cells.eq(1).text().trim(),
        year: Number(cells.eq(2).text().trim()),
      };
    })
    .get();
}
