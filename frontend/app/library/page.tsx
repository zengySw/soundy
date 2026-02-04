"use client";

import { Music, Play } from "lucide-react";
import { useState } from "react";

const tracks = [
  { id: 1, title: "City Lights", artist: "Echo Lane", gradient: "from-indigo-500 to-purple-600" },
  { id: 2, title: "Neon Drift", artist: "Violet Wave", gradient: "from-pink-500 to-purple-600" },
];

export default function LibraryPage() {
  const [current, setCurrent] = useState<number | null>(null);

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">Библиотека</h1>

      <div className="grid grid-cols-2 gap-6">
        {tracks.map(track => (
          <div
            key={track.id}
            onClick={() => setCurrent(track.id)}
            className="group bg-[#13131a] border border-white/8 rounded-2xl p-4 hover:-translate-y-1 transition-all cursor-pointer"
          >
            <div className={`aspect-square rounded-xl bg-gradient-to-br ${track.gradient} flex items-center justify-center mb-4`}>
              <Music className="w-12 h-12 text-white/50" />
            </div>

            <div className="font-semibold">{track.title}</div>
            <div className="text-sm text-gray-400">{track.artist}</div>

            <button className="mt-4 w-full py-2 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
              <Play className="w-4 h-4 fill-indigo-300" />
              Воспроизвести
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
