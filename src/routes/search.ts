/* routes/search.ts */
import { Hono } from "hono";
import {
  searchBands,
  searchArtists,
  searchAlbums,
  searchSongs,
} from "../services/searchFetch.js";

const router = new Hono();

/* -------------------------------------------------- */
/*  Petit helper : log + chronomètre                  */
/* -------------------------------------------------- */
async function logTiming<T>(
  bucket: "bands" | "artists" | "albums" | "songs",
  q: string,
  fn: () => Promise<T>
): Promise<T> {
  const label = `[${bucket}] "${q}"`;
  console.time(label); // démarre le chrono
  try {
    const res = await fn();
    console.timeEnd(label); // affiche la durée
    if (Array.isArray(res)) console.log(`   ↳ ${res.length} ${bucket} trouvés`);
    return res;
  } catch (err) {
    console.timeEnd(label);
    console.error(`   ✖ ${bucket} error →`, err);
    throw err;
  }
}

/* -------------------------------------------------- */
/*  End-points                                        */
/* -------------------------------------------------- */
router.get("/search/bands", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "Missing q" }, 400);

  try {
    const bands = await logTiming("bands", q, () => searchBands(q));
    return c.json({ bands });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/search/artists", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "Missing q" }, 400);

  try {
    const artists = await logTiming("artists", q, () => searchArtists(q));
    return c.json({ artists });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/search/albums", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "Missing q" }, 400);

  try {
    const albums = await logTiming("albums", q, () => searchAlbums(q));
    return c.json({ albums });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/search/songs", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "Missing q" }, 400);

  try {
    const songs = await logTiming("songs", q, () => searchSongs(q));
    return c.json({ songs });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
