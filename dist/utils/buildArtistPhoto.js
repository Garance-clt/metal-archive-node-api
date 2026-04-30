// utils/buildArtistPhoto.ts
import { buildImageUrl } from "./buildImageUrl.js";
export function buildArtistPhoto(id, ext = "jpg") {
    return buildImageUrl(id, "_artist", ext);
}
