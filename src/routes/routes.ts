import { Hono } from "hono";
import { logger } from "hono/logger"; // <- middleware prêt-à-l’emploi
import { fetchBandHtml } from "../services/bandFetch.js";
import { parseBand } from "../parsers/bandParser.js";
import { fetchDiscog, TABS } from "../services/discogFetch.js";

const router = new Hono();
router.use("*", logger()); // affiche méthode + URL + durée

/* -------- infos + discog «main» (résumé) -------- */
router.get("/band/:id", async (c) => {
  const id = c.req.param("id");
  console.debug(`[band] GET /band/${id} – start`);
  try {
    console.time(`[band] HTML ${id}`);
    const band = parseBand(await fetchBandHtml(id), id);
    console.timeEnd(`[band] HTML ${id}`);

    console.debug(`[band] GET /band/${id} – ok`);
    return c.json(band);
  } catch (e: any) {
    console.error(`[band] GET /band/${id} – error: ${e.message}`);
    return c.json({ error: e.message }, 502);
  }
});

/* -------- lazy : autres onglets discographie -------- */
router.get("/band/:id/discog", async (c) => {
  const id = c.req.param("id");
  const tab = (c.req.query("tab") || "main").toLowerCase() as any;
  console.debug(`[discog] GET /band/${id}/discog?tab=${tab}`);

  if (!TABS.includes(tab)) {
    console.warn(`[discog] bad tab: ${tab}`);
    return c.json({ error: "Bad tab" }, 400);
  }

  try {
    console.time(`[discog] fetch ${id} ${tab}`);
    const items = await fetchDiscog(id, tab);
    console.timeEnd(`[discog] fetch ${id} ${tab}`);

    return c.json({ bandId: id, tab, items });
  } catch (e: any) {
    console.error(`[discog] error on ${id}/${tab}: ${e.message}`);
    return c.json({ error: e.message }, 502);
  }
});

export default router;
