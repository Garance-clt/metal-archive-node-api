export interface Artist {
  id: string;
  name: string;
  realName?: string | null;
  country: string | null;
  gender?: "Male" | "Female" | "Other" | null;
  born?: string | null;
  died?: string | null;
  diedOf?: string | null;
  photo?: string | null;
  bio?: string | null;
  trivia?: string | null;

  /* -------- alias éventuels -------- */
  aliases: string[];

  /* -------- groupes et rôles -------- */
  bands: {
    bandId: string;
    bandName: string;
    url: string | null;
    role: string;
    status: "current" | "past" | "live" | "guest" | "misc";
    years: string;
  }[];
}
