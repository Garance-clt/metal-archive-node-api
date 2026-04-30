import { load } from "cheerio";
export function parseAlbum(html, id) {
    const $ = load(html);
    // -------- helper to get <dd> text by <dt> label --------
    const dd = (label) => $(`dt:contains("${label}")`).next("dd").text().trim() || null;
    /* -------- meta -------- */
    const title = $("h1.album_name a").text().trim();
    const bandA = $("h2.band_name a");
    const band = {
        id: bandA.attr("href").match(/(\d+)$/)[1],
        name: bandA.text().trim(),
    };
    /* -------- cover -------- */
    const cover = $("#cover img").attr("src") ?? null;
    /* -------- track-list -------- */
    const { tracks, total } = parseTracklist($);
    return {
        id,
        title,
        band,
        year: Number(dd("Release date")?.match(/\d{4}$/)?.[0] ?? 0),
        type: dd("Type") ?? "",
        releaseDate: dd("Release date"),
        format: dd("Format"),
        label: dd("Label"),
        catalogId: dd("Catalog ID"),
        cover,
        tracks,
        length: total,
    };
}
/* ------- helper ------- */
function parseTracklist($) {
    const res = [];
    let currentSide = null;
    $("table.table_lyrics tr").each((_, tr) => {
        const row = $(tr);
        // Side A / Side B
        if (row.hasClass("sideRow")) {
            currentSide = row.text().trim().replace(/\s+/g, " ");
            return;
        }
        const cells = row.find("td");
        if (!cells.eq(1).length)
            return; // skip spacer / total rows
        const nTxt = cells.eq(0).text().trim();
        const n = Number(nTxt.replace(/\D/g, "")); // “1.” → 1
        const title = cells.eq(1).text().trim(); // titre de la piste
        const time = cells.eq(2).text().trim();
        if (n && title && time) {
            res.push({ n, side: currentSide, title, time });
        }
    });
    // durée totale = dernière ligne du tableau
    const total = $("table.table_lyrics tr:last strong").text().trim() || null;
    return { tracks: res, total };
}
