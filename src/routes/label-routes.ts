// routes/label-routes.ts
import { Hono } from "hono";
import {
  fetchLabelHtml,
  fetchLabelRoster,
  fetchLabelPastRoster,
  fetchLabelReleases,
} from "../services/labelFetch.js";
import {
  parseLabel,
  parseLabelRoster,
  parseLabelReleases,
} from "../parsers/labelParser.js";

const router = new Hono();

router.get("/label/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  try {
    const html = await fetchLabelHtml(id);
    return c.json(parseLabel(html, id));
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/label/:id/roster", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  const includePast = (c.req.query("past") ?? "0") !== "0";
  try {
    const [currentRows, pastRows] = await Promise.all([
      fetchLabelRoster(id),
      includePast ? fetchLabelPastRoster(id) : Promise.resolve([]),
    ]);
    return c.json({
      current: parseLabelRoster(currentRows),
      past: includePast ? parseLabelRoster(pastRows) : undefined,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

router.get("/label/:id/releases", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "Invalid id" }, 400);
  try {
    const rows = await fetchLabelReleases(id);
    return c.json({ releases: parseLabelReleases(rows) });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
