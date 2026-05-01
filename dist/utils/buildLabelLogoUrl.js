// utils/buildLabelLogoUrl.ts
import { BASE_URL } from "./constants.js";
// Label logo pattern : /images/{d1}/{d2}/{id}_label.{ext}
// ex. ID 18 → /images/1/8/18_label.jpg
export function buildLabelLogoUrl(id, ext = "jpg") {
    const idStr = String(id);
    if (!/^\d+$/.test(idStr))
        throw new TypeError(`buildLabelLogoUrl: id must be numeric, got "${idStr}".`);
    const folders = idStr.slice(0, 2).split("").join("/");
    return `${BASE_URL}/images/${folders}/${idStr}_label.${ext}`;
}
