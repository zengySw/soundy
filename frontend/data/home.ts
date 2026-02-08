export type MusicCard = {
  title: string;
  artist: string;
  gradient: string;
};

export type QueueTrack = {
  title: string;
  artist: string;
  duration: string;
};

export const playlists = [
  "🔥 Топовые хиты",
  "🎸 Рок классика",
  "🌙 Вечерний chill",
  "💪 Для тренировок",
  "☕ Утренний вайб",
  "🎧 Фокус режим",
  "🎉 Вечеринка",
  "🌊 Лоу-фай биты",
];

export const popularNow: MusicCard[] = [
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  },
  {
    title: "Levitating",
    artist: "Dua Lipa",
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  },
  {
    title: "Save Your Tears",
    artist: "The Weeknd",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  },
  {
    title: "Peaches",
    artist: "Justin Bieber",
    gradient: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
  },
  {
    title: "Good 4 U",
    artist: "Olivia Rodrigo",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
  },
  {
    title: "Positions",
    artist: "Ariana Grande",
    gradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
  },
];

export const picksForYou: MusicCard[] = [
  {
    title: "Discover Weekly",
    artist: "Персональный микс",
    gradient: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
  },
  {
    title: "Daily Mix 1",
    artist: "Indie • Alternative",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)",
  },
  {
    title: "Release Radar",
    artist: "Новинки",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
  },
  {
    title: "On Repeat",
    artist: "Ваши фавориты",
    gradient: "linear-gradient(135deg, #eab308 0%, #f97316 100%)",
  },
];

export const queue: QueueTrack[] = [
  {
    title: "Starboy",
    artist: "The Weeknd",
    duration: "3:50",
  },
  {
    title: "Die For You",
    artist: "The Weeknd",
    duration: "4:20",
  },
  {
    title: "I Feel It Coming",
    artist: "The Weeknd",
    duration: "4:29",
  },
  {
    title: "The Hills",
    artist: "The Weeknd",
    duration: "4:02",
  },
  {
    title: "Earned It",
    artist: "The Weeknd",
    duration: "4:37",
  },
];
