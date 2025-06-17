// routes/band.ts
import { Hono } from "hono";
import { fetchBandHtml, fetchDiscogHtml } from "../services/bandFetch.js";
import { parseBand } from "../parsers/bandParser.js";
import { parseDiscogFragment } from "../parsers/discographyParser.js";

const router = new Hono();

router.get("/band/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.text("Invalid id", 400);

  try {
    // on parallélise, c’est plus rapide
    const [bandHtml, discogHtml] = await Promise.all([
      fetchBandHtml(id),
      fetchDiscogHtml(id),
    ]);

    const band = parseBand(bandHtml, id);
    band.releases = parseDiscogFragment(discogHtml);

    return c.json(band);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
