// utils/buildCoverUrl.ts

import { BASE_URL } from "../utils/constants.js";

const VALID_EXTS = ["jpg", "jpeg", "png"] as const;
type Ext = (typeof VALID_EXTS)[number];

export function buildCoverUrl(id: string | number, ext: Ext = "jpg"): string {
  const idStr = String(id);

  if (!/^\d+$/.test(idStr)) {
    throw new TypeError(`buildCoverUrl: id must be numeric, got “${idStr}”.`);
  }
  if (!VALID_EXTS.includes(ext)) {
    throw new RangeError(
      `buildCoverUrl: ext must be one of ${VALID_EXTS.join(", ")}.`
    );
  }
  // que jpg pour l'instant, mais on peut étendre à d'autres formats

  const folders = idStr.slice(0, 4).split("").join("/"); // ex. '987654' → '9/8/7/6'

  return `${BASE_URL}/images/${folders}/${idStr}.${ext}`;
}
