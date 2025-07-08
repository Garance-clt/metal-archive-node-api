import { Hono } from "hono";
import { fetchBandHtml } from "../services/bandFetch.js";
import { parseBand } from "../parsers/bandParser.js";
import { fetchDiscog, TABS } from "../services/discogFetch.js";

const router = new Hono();

/* -------- infos + discog «main» (résumé) -------- */
router.get("/band/:id", async (c) => {
  const id = c.req.param("id");
  try {
    console.time(`[band] GET ${id}`);
    const band = parseBand(await fetchBandHtml(id), id);
    console.timeEnd(`[band] GET ${id}`);
    return c.json(band);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

/* -------- lazy : autres onglets discographie -------- */
router.get("/band/:id/discog", async (c) => {
  const id = c.req.param("id");
  const tab = (c.req.query("tab") || "main").toLowerCase() as any;

  if (!TABS.includes(tab)) return c.json({ error: "Bad tab" }, 400);

  try {
    const items = await fetchDiscog(id, tab);
    return c.json({ bandId: id, tab, items });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
