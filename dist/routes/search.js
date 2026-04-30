/* routes/search.ts */
import { Hono } from "hono";
import { searchBands, searchArtists, searchAlbums, searchSongs, } from "../services/searchFetch.js";
const router = new Hono();
router.get("/search/bands", async (c) => {
    const q = (c.req.query("q") || "").trim();
    if (!q)
        return c.json({ error: "Missing q" }, 400);
    try {
        return c.json({ bands: await searchBands(q) });
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
router.get("/search/artists", async (c) => {
    const q = (c.req.query("q") || "").trim();
    if (!q)
        return c.json({ error: "Missing q" }, 400);
    try {
        return c.json({ artists: await searchArtists(q) });
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
router.get("/search/albums", async (c) => {
    const q = (c.req.query("q") || "").trim();
    if (!q)
        return c.json({ error: "Missing q" }, 400);
    try {
        return c.json({ albums: await searchAlbums(q) });
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
router.get("/search/songs", async (c) => {
    const q = (c.req.query("q") || "").trim();
    if (!q)
        return c.json({ error: "Missing q" }, 400);
    try {
        return c.json({ songs: await searchSongs(q) });
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
export default router;
