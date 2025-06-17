export interface ReleaseSummary {
  id: string;
  title: string;
  year: number;
  type: string;
  url: string;
}

export interface Member {
  name: string;
  role: string;
  url: string;
  status: "current" | "past" | "live";
}

export interface Band {
  id: string;
  name: string;
  country: string;
  formed: number;
  status: string;
  genre: string;
  logo: string | null;
  picture: string | null;
  releases: ReleaseSummary[];
  members: Member[];
}
