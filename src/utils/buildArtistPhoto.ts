// utils/buildArtistPhoto.ts
import { buildImageUrl } from "./buildImageUrl.js";

export function buildArtistPhoto(id: string | number, ext: "jpg" | "jpeg" | "png" | "gif" = "jpg"): string {
  return buildImageUrl(id, "_artist", ext);
}
