import { load } from "cheerio";
import { buildCoverUrl } from "../utils/buildCoverUrl.js";
import { buildArtistPhoto } from "../utils/buildArtistPhoto.js";
function resolveUrl(u) {
    if (u.startsWith("http"))
        return u;
    if (u.startsWith("//"))
        return `https:${u}`;
    return `https://www.metal-archives.com${u}`;
}
function extractImg($, anchorSelector) {
    const anchor = $(anchorSelector);
    const fromImg = anchor.find("img").attr("src") ?? anchor.find("img").attr("data-src");
    if (fromImg)
        return resolveUrl(fromImg);
    const href = anchor.attr("href");
    if (href)
        return resolveUrl(href);
    return null;
}
export function parseBiographyReadMore(html) {
    const $ = load(html);
    $('a[href^="mailto:"]').remove();
    $("br").replaceWith("\n");
    return $.root().text().trim();
}
export function parseBand(html, id) {
    const $ = load(html);
    const bandInfo = {};
    $("#band_stats dt").each((i, dt) => {
        const label = $(dt).text().trim().replace(/:$/, "");
        const dd = $(dt).next("dd");
        const value = dd.text().trim();
        bandInfo[label] = value;
    });
    const yearsActive = $("#band_stats dt:contains('Years active:')")
        .next("dd")
        .text()
        .replace(/\s+/g, " ")
        .trim();
    // Label ID depuis le lien <a> dans la dd "Current label"
    const labelAnchor = $("#band_stats dt")
        .filter((_, dt) => $(dt).text().replace(/:$/, "").trim() === "Current label")
        .next("dd")
        .find("a[href]")
        .first();
    const currentLabelId = labelAnchor.attr("href")?.match(/\/labels\/[^/]+\/(\d+)/)?.[1] ?? null;
    // Biographie
    const $comment = $("#band_info .band_comment").clone();
    // Retire les liens mailto
    $comment.find('a[href^="mailto:"]').remove();
    // Texte brut (sans e-mail)
    const biographyText = $comment.text().trim();
    // Read more ?
    const readMoreHref = $(".btn_read_more").attr("onclick");
    const readMoreIdMatch = readMoreHref?.match(/read-more\/id\/(\d+)/);
    const biographyReadMoreUrl = readMoreIdMatch
        ? `https://www.metal-archives.com/band/read-more/id/${readMoreIdMatch[1]}`
        : null;
    return {
        id,
        name: $("h1.band_name > a").text().trim(),
        country: bandInfo["Country of origin"] || "",
        location: bandInfo["Location"] || "",
        formed: Number(bandInfo["Formed in"]) || 0,
        status: bandInfo["Status"] || "",
        genre: bandInfo["Genre"] || "",
        lyricalThemes: bandInfo["Themes"] || null,
        currentLabel: bandInfo["Current label"] || null,
        currentLabelId: currentLabelId,
        yearsActive: yearsActive || null,
        logo: extractImg($, "a#logo"),
        picture: extractImg($, "a#photo"),
        releases: parseDiscog($),
        members: parseMembers($),
        biography: biographyText || null,
        biographyReadMoreUrl,
    };
}
function parseDiscog($) {
    return $("div#band_tab_discography table.discog tbody tr")
        .map((_, tr) => {
        const cells = $(tr).find("td");
        const a = cells.eq(0).find("a");
        const href = a.attr("href");
        if (!href)
            return null;
        const idMatch = href.match(/(\d+)(?:\D*$)/);
        if (!idMatch)
            return null;
        const id = idMatch[1];
        return {
            id,
            url: href,
            title: a.text().trim(),
            type: cells.eq(1).text().trim(),
            year: Number(cells.eq(2).text().trim()),
            cover: buildCoverUrl(id),
        };
    })
        .get()
        .filter(Boolean);
}
function extractArtistIdFromUrl(url) {
    const match = url.match(/\/artists\/[^/]+\/(\d+)/);
    return match ? match[1] : null;
}
function parseMembers($) {
    const members = [];
    const grab = (tabSel, status) => {
        $(`${tabSel} table.lineupTable tr.lineupRow`).each((_, tr) => {
            const row = $(tr);
            const link = row.find("a.bold");
            const href = link.attr("href") ?? "";
            const id = extractArtistIdFromUrl(href) ?? undefined;
            const member = {
                id,
                name: link.text().trim(),
                url: href,
                status,
                role: row.find("td").eq(1).text().replace(/\s+/g, " ").trim(),
                photo: id ? buildArtistPhoto(id) : undefined,
            };
            // also in:
            const bandsRow = row.next("tr.lineupBandsRow");
            if (bandsRow.length) {
                member.otherBands = bandsRow
                    .find("a")
                    .map((_, a) => {
                    const el = $(a);
                    return { name: el.text().trim(), url: el.attr("href") ?? "" };
                })
                    .get();
            }
            members.push(member);
        });
    };
    grab("#band_tab_members_current", "current");
    grab("#band_tab_members_live", "live");
    grab("#band_tab_members_past", "past");
    if (!members.length) {
        $("#band_tab_members_all table.lineupTable tr.lineupRow").each((_, tr) => {
            const row = $(tr);
            const link = row.find("a.bold");
            const href = link.attr("href") ?? "";
            const id = extractArtistIdFromUrl(href) ?? undefined;
            // détecter le statut depuis le header précédent
            const statusText = $(tr)
                .prevAll("tr.lineupHeaders")
                .first()
                .text()
                .toLowerCase();
            let status = "past";
            if (statusText.includes("current"))
                status = "current";
            if (statusText.includes("live"))
                status = "live";
            const member = {
                id,
                name: link.text().trim(),
                url: href,
                status,
                role: row.find("td").eq(1).text().replace(/\s+/g, " ").trim(),
                photo: id ? buildArtistPhoto(id) : undefined,
            };
            const bandsRow = row.next("tr.lineupBandsRow");
            if (bandsRow.length) {
                member.otherBands = bandsRow
                    .find("a")
                    .map((_, a) => {
                    const el = $(a);
                    return { name: el.text().trim(), url: el.attr("href") ?? "" };
                })
                    .get();
            }
            members.push(member);
        });
    }
    return members;
}
export function parseBandSimilar(html) {
    const $ = load(html);
    const results = [];
    $("#artist_list tbody tr[id^='recRow_']").each((_, tr) => {
        const rowId = $(tr).attr("id") ?? "";
        const id = rowId.replace("recRow_", "");
        const cells = $(tr).find("td");
        const name = cells.eq(0).find("a").text().trim();
        const country = cells.eq(1).text().trim();
        const genre = cells.eq(2).text().trim();
        const score = parseInt(cells.eq(3).find("span").text().trim(), 10) || 0;
        if (id && name)
            results.push({ id, name, country, genre, score });
    });
    return results;
}
export function parseBandLinks(html) {
    const $ = load(html);
    const results = [];
    let currentCategory = "Other";
    $("table[id^='linksTable'] tr").each((_, tr) => {
        const trId = $(tr).attr("id") ?? "";
        if (trId.startsWith("header_")) {
            currentCategory = $(tr).text().trim();
            return;
        }
        if (trId.startsWith("linkRow")) {
            const id = trId.replace("linkRow", "");
            const a = $(tr).find("a").first();
            const url = a.attr("href") ?? "";
            const title = a.text().trim();
            if (url && title)
                results.push({ id, category: currentCategory, title, url });
        }
    });
    return results;
}
