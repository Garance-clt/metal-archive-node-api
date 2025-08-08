export type BandStatus = "current" | "past" | "live" | "guest" | "misc";

export type ContributionTrack = {
  trackNo?: number | null;
  title: string; // peut rester "" si inconnu (fallback)
  role?: string | null; // ex: "vocals (lead)"
};

export type BandContribution = {
  releaseId: string; // id Metal Archives de l’album
  title: string; // titre de l’album/sortie
  year: number | null;
  type: string | null; // Album, EP, Single, Live, ...
  cover: string | null; // peut être null: frontend a un fallback
  roleSummary: string | null; // ex: "Vocals (tracks 1-3)"
  tracks: ContributionTrack[];
};

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
  birthCity?: string | null;
  age?: number | null;
  bornISO?: string | null;
  diedISO?: string | null;
  bioHtml?: string | null;
  bioReadMoreUrl?: string | null;
  triviaReadMoreUrl?: string | null;
  triviaHtml?: string | null;

  /** Aliases/pseudos éventuels */
  aliases: string[];

  /** Groupes et rôles */
  bands: {
    bandId: string;
    bandName: string;
    url: string | null;
    role: string;
    status: BandStatus;
    years: string;

    /** Ex: "As Nick Royale" si dispo dans la page */
    aliasContext?: string | null;

    /** Contributions de l'artiste dans ce groupe (albums/pistes) */
    contributions?: BandContribution[];
  }[];
}
