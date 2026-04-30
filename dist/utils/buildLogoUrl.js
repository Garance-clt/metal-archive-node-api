// utils/buildLogoUrl.ts
import { buildImageUrl } from "./buildImageUrl.js";
export function buildLogoUrl(id, ext = "jpg") {
    return buildImageUrl(id, "_logo", ext);
}
