// utils/buildImageUrl.ts
import { BASE_URL } from "./constants.js";
const VALID_EXTS = ["jpg", "jpeg", "png", "gif"];
// ex. '987654' → '9/8/7/6/987654_logo.jpg'
export function buildImageUrl(id, suffix, ext = "jpg") {
    const idStr = String(id);
    if (!/^\d+$/.test(idStr))
        throw new TypeError(`buildImageUrl: id must be numeric, got "${idStr}".`);
    if (!VALID_EXTS.includes(ext))
        throw new RangeError(`buildImageUrl: ext must be one of ${VALID_EXTS.join(", ")}.`);
    // ex. '987654' → '9/8/7/6/987654_logo.jpg'
    const folders = idStr.slice(0, 4).split("").join("/");
    return `${BASE_URL}/images/${folders}/${idStr}${suffix}.${ext}`;
}
