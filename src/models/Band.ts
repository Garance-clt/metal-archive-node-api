export interface ReleaseSummary {
  id: string;
  title: string;
  year: number;
  type: string;
  url: string;
}

export interface Member {
  id?: string; // optional, can be used for unique identification
  name: string;
  role: string;
  url: string;
  status: "current" | "past" | "live";
  photo?: string; // optional, if available
  otherBands?: { name: string; url: string }[]; // other bands the
}

export interface Band {
  id: string;
  name: string;
  country: string;
  location: string | null;
  formed: number;
  status: string;
  genre: string;
  logo: string | null;
  yearsActive: string | null;
  biography: string | null;
  biographyReadMoreUrl: string | null;
  currentLabel: string | null;
  lyricalThemes: string | null;
  picture: string | null;
  releases: ReleaseSummary[];
  members: Member[];
}
