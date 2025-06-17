// routes/albums.ts
import { Hono } from "hono";
import { fetchAlbumHtml } from "../services/albumFetch.js";
import { parseAlbum } from "../parsers/albumParser.js";

const router = new Hono();

router.get("/albums/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.text("Invalid id", 400);

  try {
    const html = await fetchAlbumHtml(id);
    const album = parseAlbum(html, id);
    return c.json(album);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
