export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  genre: string | null;
  durationMs: number | null;
  cover: string | null;
  isAd?: boolean;
};
