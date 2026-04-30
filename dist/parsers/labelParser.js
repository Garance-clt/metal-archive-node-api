// parsers/labelParser.ts
import { load } from "cheerio";
import { buildImageUrl } from "../utils/buildImageUrl.js";
/* ---------- helpers ---------- */
function pickAnchor(html) {
    const $ = load(html);
    const a = $("a[href]").first();
    const href = a.attr("href") ?? "";
    const id = href.match(/\/(\d+)(?:[^0-9]|$)/)?.[1] ?? null;
    return id ? { id, name: a.text().trim() } : null;
}
function tryLabelLogo(id) {
    try {
        return buildImageUrl(id, "_label", "gif");
    }
    catch {
        try {
            return buildImageUrl(id, "_label", "png");
        }
        catch {
            return null;
        }
    }
}
/* ---------- label page ---------- */
export function parseLabel(html, id) {
    const $ = load(html);
    const name = $("h1.label_name").text().trim();
    // Logo : récupérer l'URL réelle depuis la page
    const logoSrc = $("div.label_img img").attr("src") ??
        $("a#label_logo img").attr("src") ??
        null;
    const logo = logoSrc ? logoSrc.split("?")[0] : tryLabelLogo(id);
    // Stats dt/dd
    const stats = {};
    const statsDd = {}; // raw HTML for links
    $("#label_info dl dt, #label_stats dt").each((_, dt) => {
        const key = $(dt).text().trim().replace(/:$/, "").trim();
        const dd = $(dt).next("dd");
        stats[key] = dd.text().replace(/\s+/g, " ").trim();
        statsDd[key] = dd.html() ?? "";
    });
    // Sub-labels
    const subLabels = [];
    const subDd = statsDd["Sub-labels"] ?? "";
    if (subDd) {
        load(subDd)("a[href]").each((_, a) => {
            const el = load(a)("a");
            const href = el.attr("href") ?? "";
            const subId = href.match(/\/(\d+)(?:$|[^0-9])/)?.[1];
            if (subId)
                subLabels.push({ id: subId, name: el.text().trim() });
        });
    }
    // Parent label
    let parentLabel = null;
    const parentDd = statsDd["Parent label"] ?? "";
    if (parentDd) {
        const pa = pickAnchor(parentDd);
        if (pa)
            parentLabel = pa;
    }
    // Notes / additional info
    const $notes = $("#label_tab_notes .band_comment").clone();
    $notes.find('a[href^="mailto:"]').remove();
    const notes = $notes.text().trim() || null;
    const readMoreHref = $("#label_tab_notes .btn_read_more").attr("onclick") ?? "";
    const readMoreIdMatch = readMoreHref.match(/read-more\/id\/(\d+)/);
    const notesReadMoreUrl = readMoreIdMatch
        ? `https://www.metal-archives.com/label/read-more/id/${readMoreIdMatch[1]}`
        : null;
    const onlineShoppingText = (stats["Online shopping"] ?? "").toLowerCase();
    const onlineShopping = onlineShoppingText === "yes"
        ? true
        : onlineShoppingText === "no"
            ? false
            : null;
    return {
        id,
        name,
        country: stats["Country"] || null,
        status: stats["Status"] || null,
        specialties: stats["Styles/specialties"] || stats["Specialised in"] || null,
        foundingDate: stats["Founding date"] || stats["Founding date :"] || null,
        onlineShopping,
        parentLabel,
        subLabels,
        logo,
        notes,
        notesReadMoreUrl,
    };
}
/* ---------- roster ---------- */
export function parseLabelRoster(rows) {
    return rows.flatMap((r) => {
        const a = pickAnchor(r[0]);
        if (!a)
            return [];
        return [{
                id: a.id,
                name: a.name,
                genre: (r[1] ?? "").replace(/\s+/g, " ").trim(),
                country: load(r[2] ?? "").text().trim(),
            }];
    });
}
/* ---------- releases ---------- */
export function parseLabelReleases(rows) {
    return rows.flatMap((r) => {
        const bandAnchor = pickAnchor(r[0] ?? "");
        const albumAnchor = pickAnchor(r[1] ?? "");
        return [{
                bandId: bandAnchor?.id ?? null,
                bandName: bandAnchor?.name ?? load(r[0] ?? "").text().trim(),
                albumId: albumAnchor?.id ?? null,
                albumTitle: albumAnchor?.name ?? load(r[1] ?? "").text().trim(),
                type: (r[2] ?? "").trim(),
                year: Number(r[3]) || 0,
                catalogId: (r[4] ?? "").trim(),
                format: (r[5] ?? "").trim(),
            }];
    });
}
