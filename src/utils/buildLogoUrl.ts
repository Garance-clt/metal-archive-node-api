import { BASE_URL } from "../utils/constants.js";

const VALID_EXTS = ["jpg", "jpeg", "png", "gif"] as const;
type Ext = (typeof VALID_EXTS)[number];

export function buildLogoUrl(id: string | number, ext: Ext = "jpg"): string {
  const idStr = String(id);

  if (!/^\d+$/.test(idStr)) {
    throw new TypeError(`buildLogoUrl: id must be numeric, got “${idStr}”.`);
  }
  if (!VALID_EXTS.includes(ext)) {
    throw new RangeError(
      `buildLogoUrl: ext must be one of ${VALID_EXTS.join(", ")}.`
    );
  }

  // Profondeur = 1 à 4 dossiers suivant la taille de l'ID
  const folders = idStr.slice(0, 4).split("").join("/"); // ex. '987654' → '9/8/7/6'

  return `${BASE_URL}/images/${folders}/${idStr}_logo.${ext}`;
}
