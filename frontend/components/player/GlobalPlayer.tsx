"use client";

import { useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
import PlayerBar from "@/components/home/PlayerBar";
import { formatDuration } from "@/utils/format";

export default function GlobalPlayer() {
  const {
    isPlaying,
    progress,
    volume,
    isMuted,
    currentTrackIndex,
    hasTrackSelected,
    tracks,
    progressRef,
    volumeRef,
    handleProgressClick,
    handleVolumeClick,
    handleVolumeChange,
    handleMuteToggle,
    handlePlayToggle,
  } = usePlayer();

  const currentTrack = useMemo(() => {
    if (!hasTrackSelected) {
      return null;
    }
    const track = tracks[currentTrackIndex] ?? tracks[0] ?? null;
    if (!track) {
      return null;
    }
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: formatDuration(track.durationMs),
    };
  }, [currentTrackIndex, hasTrackSelected, tracks]);

  return (
    <PlayerBar
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      progress={progress}
      volume={volume}
      isMuted={isMuted}
      progressRef={progressRef}
      volumeRef={volumeRef}
      onPlayToggle={handlePlayToggle}
      onProgressClick={handleProgressClick}
      onVolumeClick={handleVolumeClick}
      onVolumeChange={handleVolumeChange}
      onMuteToggle={handleMuteToggle}
    />
  );
}
