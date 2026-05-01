// routes/home-routes.ts
import { Hono } from "hono";
import { fetchUpcomingReleases, fetchBandsByCountry, fetchLatestAdditions } from "../services/homeFetch.js";
import { curlGetRedirectUrl } from "../utils/curlFetch.js";

const router = new Hono();

/* -------- upcoming releases -------- */
router.get("/home/upcoming", async (c) => {
  try {
    const releases = await fetchUpcomingReleases();
    return c.json({ releases });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

/* -------- random band (no cache) -------- */
router.get("/home/random-band", async (c) => {
  try {
    const finalUrl = await curlGetRedirectUrl(
      "https://www.metal-archives.com/band/random"
    );
    const match = finalUrl.match(/\/bands\/[^/]+\/(\d+)/) ??
                  finalUrl.match(/\/band\/view\/id\/(\d+)/);
    if (!match) {
      return c.json({ error: "Could not determine band ID from redirect" }, 502);
    }
    return c.json({ id: match[1] });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

/* -------- bands by country -------- */
router.get("/home/bands-by-country", async (c) => {
  const country = c.req.query("country") ?? "";
  if (!country || !/^[A-Z]{2}$/.test(country)) {
    return c.json({ error: "Invalid country code (expected 2-letter ISO code)" }, 400);
  }
  try {
    const result = await fetchBandsByCountry(country);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

/* -------- latest additions -------- */
router.get("/home/latest", async (c) => {
  try {
    const data = await fetchLatestAdditions();
    return c.json(data);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
