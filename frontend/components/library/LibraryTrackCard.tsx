"use client";

import { Music, Play } from "lucide-react";
import type { LibraryTrack } from "@/data/library";

interface LibraryTrackCardProps {
  track: LibraryTrack;
  onSelect: (id: number) => void;
}

export default function LibraryTrackCard({ track, onSelect }: LibraryTrackCardProps) {
  return (
    <div
      onClick={() => onSelect(track.id)}
      className="library-card"
    >
      <div
        className="library-card-cover"
        style={{ background: track.gradient }}
      >
        <Music className="library-card-icon" />
      </div>

      <div className="library-card-title">{track.title}</div>
      <div className="library-card-artist">{track.artist}</div>

      <button className="library-card-cta" type="button">
        <Play className="library-card-cta-icon" />
        Воспроизвести
      </button>
    </div>
  );
}
