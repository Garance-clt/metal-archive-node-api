export interface SubLabel {
  id: string;
  name: string;
}

export interface Label {
  id: string;
  name: string;
  country: string | null;
  status: string | null;
  specialties: string | null;
  foundingDate: string | null;
  onlineShopping: boolean | null;
  parentLabel: SubLabel | null;
  subLabels: SubLabel[];
  logo: string | null;
  notes: string | null;
  notesReadMoreUrl: string | null;
}

export interface LabelBand {
  id: string;
  name: string;
  genre: string;
  country: string;
}

export interface LabelRelease {
  bandId: string | null;
  bandName: string;
  albumId: string | null;
  albumTitle: string;
  type: string;
  year: number;
  catalogId: string;
  format: string;
}
