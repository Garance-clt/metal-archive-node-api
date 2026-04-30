// utils/buildLogoUrl.ts
import { buildImageUrl } from "./buildImageUrl.js";

export function buildLogoUrl(id: string | number, ext: "jpg" | "jpeg" | "png" | "gif" = "jpg"): string {
  return buildImageUrl(id, "_logo", ext);
}
