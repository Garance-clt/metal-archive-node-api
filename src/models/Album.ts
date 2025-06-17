// models/Album.ts
export interface Track {
  n: number;
  side: string | null; // ex. “Side A” ou null si CD
  title: string;
  time: string; // "03:57"
}

export interface Album {
  id: string;
  title: string;
  band: { id: string; name: string };
  year: number;
  type: string; // Full-length, EP…
  releaseDate: string; // “June 4th, 1990”
  format: string | null; // “12\" vinyl (33⅓ RPM)”
  label: string | null;
  catalogId: string | null;
  cover: string | null;
  tracks: Track[];
  length: string | null; // durée totale “39:16”
}
