import { Hono } from "hono";
import { fetchAlbumHtml } from "../services/albumFetch.js";
import { fetchReleaseCover } from "../services/releaseCover.js";
import { curlFetchResponse } from "../utils/curlFetch.js";
import { BASE_URL } from "../utils/constants.js";
import { parseReleasePage, attachLyricsToTracks, fetchOtherVersions, } from "../parsers/releaseParser.js";
const router = new Hono();
router.get("/albums/:id", async (c) => {
    const id = c.req.param("id");
    if (!/^\d+$/.test(id))
        return c.text("Invalid id", 400);
    const wantLyrics = (c.req.query("lyrics") ?? "1") !== "0";
    const wantVersions = (c.req.query("versions") ?? "1") !== "0";
    try {
        const html = await fetchAlbumHtml(id);
        const album = parseReleasePage(html, `${BASE_URL}/albums/_/_/${id}`);
        if (wantLyrics && album.tracklist?.some((t) => t.lyricsId)) {
            await attachLyricsToTracks(album.tracklist, curlFetchResponse, { concurrency: 4, retry: 2 });
        }
        if (wantVersions && album.id) {
            try {
                album.otherVersions = await fetchOtherVersions(album.id, curlFetchResponse, { parentId: album.id });
            }
            catch {
                album.otherVersions = [];
            }
        }
        return c.json(album);
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
// redirects to the verified cover URL (tries jpg/jpeg/png/gif, then HTML scrape); cached 24h
router.get("/albums/:id/cover", async (c) => {
    const id = c.req.param("id");
    if (!/^\d+$/.test(id))
        return c.text("Invalid id", 400);
    const url = await fetchReleaseCover(id);
    if (!url)
        return c.text("No cover found", 404);
    return c.redirect(url, 302);
});
export default router;
