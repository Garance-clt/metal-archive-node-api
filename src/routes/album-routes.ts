import { Hono } from "hono";
import { fetchAlbumHtml } from "../services/albumFetch.js";
import { curlFetchResponse } from "../utils/curlFetch.js";
import { BASE_URL } from "../utils/constants.js";
import {
  parseReleasePage,
  attachLyricsToTracks,
  fetchOtherVersions,
  type TrackWithLyrics,
} from "../parsers/releaseParser.js";

const router = new Hono();

router.get("/albums/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.text("Invalid id", 400);

  const wantLyrics = (c.req.query("lyrics") ?? "1") !== "0";
  const wantVersions = (c.req.query("versions") ?? "1") !== "0";

  try {
    const html = await fetchAlbumHtml(id);
    const album = parseReleasePage(html, `${BASE_URL}/albums/_/_/${id}`);

    if (wantLyrics && album.tracklist?.some((t) => t.lyricsId)) {
      await attachLyricsToTracks(
        album.tracklist as unknown as TrackWithLyrics[],
        curlFetchResponse,
        { concurrency: 4, retry: 2 }
      );
    }

    if (wantVersions && album.id) {
      try {
        album.otherVersions = await fetchOtherVersions(
          album.id,
          curlFetchResponse,
          { parentId: album.id }
        );
      } catch {
        album.otherVersions = [];
      }
    }

    return c.json(album);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export default router;
