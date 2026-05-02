import { Hono } from "hono";
import { fetchBandHtml, fetchBandSimilar, fetchBandLinks } from "../services/bandFetch.js";
import {
  parseBand,
  parseBiographyReadMore,
  parseBandSimilar,
  parseBandLinks,
} from "../parsers/bandParser.js";
import { fetchDiscog, TABS } from "../services/discogFetch.js";
import { curlFetch } from "../utils/curlFetch.js";

const router = new Hono();

router.get("/band/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  try {
    const band = parseBand(await fetchBandHtml(id), id);
    return c.json(band);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/band/:id/discog", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  const tab = (c.req.query("tab") || "main").toLowerCase() as any;

  if (!TABS.includes(tab)) {
    return c.json({ error: "Bad tab" }, 400);
  }

  try {
    const items = await fetchDiscog(id, tab);
    return c.json({ bandId: id, tab, items });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/band/read-more/id/:id", async (c) => {
  const id = c.req.param("id");
  if (!id || !/^\d+$/.test(id)) return c.text("Invalid ID", 400);

  try {
    const html = await curlFetch(
      `https://www.metal-archives.com/band/read-more/id/${id}`
    );
    return c.text(parseBiographyReadMore(html));
  } catch (e: any) {
    return c.text(e.message, 502);
  }
});

router.get("/band/:id/similar", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  try {
    const html = await fetchBandSimilar(id);
    return c.json({ similar: parseBandSimilar(html) });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/band/:id/links", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  try {
    const html = await fetchBandLinks(id);
    return c.json({ links: parseBandLinks(html) });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
