import { Hono } from "hono";
import { siteSearch } from "../services/searchFetch.js";

const router = new Hono();

/**
 * GET /search?q=<term>
 * Renvoie les « top hits » + buckets (max 10 items / type)
 */
router.get("/search", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "Missing q" }, 400);

  try {
    const raw = await siteSearch(q);

    /* ---------- petit scoring naïf ---------- */
    const norm = (s: string) => s.toLowerCase();
    const isName = (r: any) => norm(r.name || r.title);
    const exact = raw.filter((r) => isName(r) === norm(q));
    const starts = raw.filter(
      (r) => !exact.includes(r) && isName(r).startsWith(norm(q))
    );
    const topHits = [...exact, ...starts].slice(0, 3);

    /* ---------- buckets par type ---------- */
    return c.json({
      query: q,
      topHits,
      bands: raw.filter((r) => r.type === "band").slice(0, 10),
      artists: raw.filter((r) => r.type === "artist").slice(0, 10),
      albums: raw.filter((r) => r.type === "album").slice(0, 10),
      songs: raw.filter((r) => r.type === "song").slice(0, 10),
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
