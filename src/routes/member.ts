import { Hono } from "hono";
import { fetchArtistHtml } from "../services/artistFetch.js";
import { parseArtist } from "../parsers/artistParser.js";

const router = new Hono();

router.get("/member/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.text("Invalid id", 400);

  try {
    const html = await fetchArtistHtml(id);
    const artist = parseArtist(html, id);
    return c.json(artist);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
