export type LibraryTrack = {
  id: number;
  title: string;
  artist: string;
  gradient: string;
};

export const tracks: LibraryTrack[] = [
  {
    id: 1,
    title: "City Lights",
    artist: "Echo Lane",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  },
  {
    id: 2,
    title: "Neon Drift",
    artist: "Violet Wave",
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  },
];
