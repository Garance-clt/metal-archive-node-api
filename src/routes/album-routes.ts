// routes/albums.ts
import { Hono } from "hono";
import { fetchAlbumHtml } from "../services/albumFetch.js";
import {
  parseReleasePage,
  attachLyricsToTracks,
  fetchOtherVersions, // ⬅️
  type TrackWithLyrics,
} from "../parsers/releaseParser.js";

const router = new Hono();

router.get("/albums/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.text("Invalid id", 400);

  const wantLyrics = (c.req.query("lyrics") ?? "1") !== "0";
  const wantVersions = (c.req.query("versions") ?? "1") !== "0"; // ⬅️ flag optionnel

  try {
    const html = await fetchAlbumHtml(id);
    const album = parseReleasePage(
      html,
      `https://www.metal-archives.com/albums/_/_/${id}`
    );

    // Lyrics
    if (wantLyrics && album.tracklist?.some((t) => t.lyricsId)) {
      await attachLyricsToTracks(
        album.tracklist as unknown as TrackWithLyrics[],
        (url, init) => fetch(url, init),
        { concurrency: 4, retry: 2 }
      );
    }

    // Other versions
    if (wantVersions && album.id) {
      try {
        album.otherVersions = await fetchOtherVersions(
          album.id,
          (url, init) => fetch(url, init),
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
