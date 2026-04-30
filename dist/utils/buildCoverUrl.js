// utils/buildCoverUrl.ts
import { buildImageUrl } from "./buildImageUrl.js";
export function buildCoverUrl(id, ext = "jpg") {
    return buildImageUrl(id, "", ext);
}
