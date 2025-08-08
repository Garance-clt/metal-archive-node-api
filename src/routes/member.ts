import { Hono } from "hono";
import { fetchArtistHtml } from "../services/artistFetch.js";
import { parseArtist, parseArtistReadMore } from "../parsers/artistParser.js";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const router = new Hono();

router.get("/member/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id))
    return c.text("Invalid id", 400 as ContentfulStatusCode);

  try {
    const html = await fetchArtistHtml(id);
    const artist = parseArtist(html, id);
    return c.json(artist);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/artist/read-more/id/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id))
    return c.text("Invalid id", 400 as ContentfulStatusCode);

  try {
    const res = await fetch(
      `https://www.metal-archives.com/artist/read-more/id/${id}`
    );
    if (!res.ok) {
      // ✅ use overload (text, status?)
      return c.text(
        `Upstream ${res.status}`,
        res.status as ContentfulStatusCode
      );
    }
    const html = await res.text(); // ✅ you were missing this
    return c.text(parseArtistReadMore(html));
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
