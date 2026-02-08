"use client";

import { useEffect, useMemo, useState } from "react";
import { playlists } from "@/data/home";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import HomeHero from "@/components/home/HomeHero";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import SectionGrid from "@/components/home/SectionGrid";
import Header from "@/components/Header/Header";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const {
    isPlaying,
    currentTrackIndex,
    hasTrackSelected,
    handleTrackSelect,
    handlePlayToggle,
    handleCardPlay,
    tracks,
  } = usePlayer();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const loadFavorites = async () => {
      try {
        const res = await apiFetch("/favorites");
        if (!res.ok) {
          return;
        }
        const data: Array<{ id: string }> = await res.json();
        if (mounted) {
          setFavoriteIds(new Set(data.map((item) => item.id)));
        }
      } catch {
        // ignore
      }
    };

    loadFavorites();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleFavorite = async (id: string) => {
    const next = new Set(favoriteIds);
    const isFav = next.has(id);
    if (isFav) {
      next.delete(id);
      setFavoriteIds(next);
      await apiFetch(`/favorites/${id}`, {
        method: "DELETE",
      });
      return;
    }
    next.add(id);
    setFavoriteIds(next);
    await apiFetch(`/favorites/${id}`, {
      method: "POST",
    });
  };

  const queue = useMemo(
    () =>
      tracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: formatDuration(track.durationMs),
      })),
    [tracks],
  );

  const currentTrack = useMemo(
    () => queue[currentTrackIndex] ?? queue[0],
    [currentTrackIndex, queue],
  );

  const cards = useMemo(
    () =>
      tracks.map((track, index) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        index,
        isFavorite: favoriteIds.has(track.id),
        gradient:
          index % 2 === 0
            ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            : "linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)",
      })),
    [tracks, favoriteIds],
  );

  return (
    <>
      <div className="bg-gradient" />

      <div className="app">
        <Header />

        <div className="main-grid">
          <HomeSidebar playlists={playlists} />

          <main className="main-content">
            <HomeHero isPlaying={isPlaying} onPlayToggle={handlePlayToggle} />

            <SectionGrid
              title="Популярное сейчас"
              cards={cards.slice(0, 6)}
              onCardPlay={handleCardPlay}
              onToggleFavorite={handleToggleFavorite}
              currentTrackIndex={currentTrackIndex}
              isPlaying={isPlaying}
              hasTrackSelected={hasTrackSelected}
              onPlayToggle={handlePlayToggle}
            />

            <SectionGrid
              title="Для вас"
              cards={cards.slice(6, 12)}
              onCardPlay={handleCardPlay}
              onToggleFavorite={handleToggleFavorite}
              currentTrackIndex={currentTrackIndex}
              isPlaying={isPlaying}
              hasTrackSelected={hasTrackSelected}
              onPlayToggle={handlePlayToggle}
            />
          </main>

          {currentTrack ? (
            <NowPlayingPanel
              currentTrack={currentTrack}
              queue={queue}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={handleTrackSelect}
            />
          ) : null}
        </div>

      </div>
    </>
  );
}
