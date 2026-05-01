// utils/buildCoverUrl.ts
import { buildImageUrl } from "./buildImageUrl.js";

export function buildCoverUrl(id: string | number, ext: "jpg" | "jpeg" | "png" | "gif" = "jpg"): string {
  return buildImageUrl(id, "", ext);
}
