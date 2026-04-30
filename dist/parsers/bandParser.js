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
    $('a[href^="mailto:"]').remove(); // Retire les emails
    return $.root()
        .text()
        .replace(/<br\s*\/?>/gi, "\n")
        .trim();
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
        yearsActive: yearsActive || null,
        logo: extractImg($, "a#logo"),
        picture: extractImg($, "a#photo"),
        releases: parseDiscog($),
        members: parseMembers($),
        biography: biographyText || null,
        biographyReadMoreUrl,
    };
}
/* -------- Discographie (résumé) -------- */
function parseDiscog($) {
    return $("div#band_tab_discography table.discog tbody tr")
        .map((_, tr) => {
        const cells = $(tr).find("td");
        const a = cells.eq(0).find("a");
        const id = a.attr("href").match(/(\d+)(?:\D*$)/)[1];
        return {
            id,
            url: a.attr("href"),
            title: a.text().trim(),
            type: cells.eq(1).text().trim(),
            year: Number(cells.eq(2).text().trim()),
            cover: buildCoverUrl(id),
        };
    })
        .get();
}
function extractArtistIdFromUrl(url) {
    const match = url.match(/\/artists\/[^/]+\/(\d+)/);
    if (!match)
        throw new Error(`Invalid artist URL: ${url}`);
    return match[1];
}
function parseMembers($) {
    const members = [];
    const grab = (tabSel, status) => {
        $(`${tabSel} table.lineupTable tr.lineupRow`).each((_, tr) => {
            const row = $(tr);
            const link = row.find("a.bold");
            const href = link.attr("href") ?? "";
            const id = extractArtistIdFromUrl(href);
            const member = {
                id,
                name: link.text().trim(),
                url: href,
                status,
                role: row.find("td").eq(1).text().replace(/\s+/g, " ").trim(),
                photo: buildArtistPhoto(id),
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
            const id = extractArtistIdFromUrl(href);
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
                photo: buildArtistPhoto(id),
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
