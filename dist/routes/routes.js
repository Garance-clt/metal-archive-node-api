import { Hono } from "hono";
import { fetchBandHtml } from "../services/bandFetch.js";
import { parseBand, parseBiographyReadMore } from "../parsers/bandParser.js";
import { fetchDiscog, TABS } from "../services/discogFetch.js";
import { curlFetch } from "../utils/curlFetch.js";
const router = new Hono();
/* -------- infos + discog main (résumé) -------- */
router.get("/band/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const band = parseBand(await fetchBandHtml(id), id);
        return c.json(band);
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
/* -------- lazy : autres onglets discographie -------- */
router.get("/band/:id/discog", async (c) => {
    const id = c.req.param("id");
    const tab = (c.req.query("tab") || "main").toLowerCase();
    if (!TABS.includes(tab)) {
        return c.json({ error: "Bad tab" }, 400);
    }
    try {
        const items = await fetchDiscog(id, tab);
        return c.json({ bandId: id, tab, items });
    }
    catch (e) {
        return c.json({ error: e.message }, 502);
    }
});
router.get("/band/read-more/id/:id", async (c) => {
    const id = c.req.param("id");
    if (!id)
        return c.text("Missing ID", 400);
    try {
        const html = await curlFetch(`https://www.metal-archives.com/band/read-more/id/${id}`);
        return c.text(parseBiographyReadMore(html));
    }
    catch (e) {
        return c.text(e.message, 502);
    }
});
export default router;
