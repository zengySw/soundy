"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import HomeHero from "@/components/home/HomeHero";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import SectionGrid from "@/components/home/SectionGrid";
import PlaylistSectionGrid from "@/components/home/PlaylistSectionGrid";
import Header from "@/components/Header/Header";
import { useResizableSidebars } from "@/hooks/useResizableSidebars";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const {
    isPlaying,
    currentTrackIndex,
    currentTrackId,
    hasTrackSelected,
    handleTrackSelect,
    handlePlayToggle,
    handleCardPlay,
    favoriteIds,
    toggleFavorite,
    tracks,
    queue,
    isLoadingTracks,
  } = usePlayer();
  const {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  } = useResizableSidebars();
  const queueItems = useMemo(
    () =>
      queue.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: formatDuration(track.durationMs),
        cover: track.cover ?? null,
      })),
    [queue],
  );

  const currentTrack = useMemo(
    () => queueItems[currentTrackIndex] ?? queueItems[0],
    [currentTrackIndex, queueItems],
  );

  const gridStyle = useMemo(
    () =>
      ({
        "--sidebar-left": `${leftWidth}px`,
        "--sidebar-right": `${rightWidth}px`,
      }) as CSSProperties,
    [leftWidth, rightWidth],
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

  const sectionSize = 30;
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; track_count?: number | null }>>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPlaylists = async () => {
      try {
        const res = await apiFetch("/playlists");
        if (!res.ok) {
          if (res.status === 401) {
            setPlaylistsError("Войдите, чтобы видеть плейлисты");
          } else {
            setPlaylistsError("Не удалось загрузить плейлисты");
          }
          return;
        }
        const data = await res.json();
        if (mounted) {
          setPlaylists(Array.isArray(data) ? data : []);
          setPlaylistsError(null);
        }
      } catch {
        if (mounted) {
          setPlaylistsError("Не удалось загрузить плейлисты");
        }
      } finally {
        if (mounted) {
          setPlaylistsLoading(false);
        }
      }
    };
    loadPlaylists();
    return () => {
      mounted = false;
    };
  }, []);
  const skeletonCards = useMemo(
    () =>
      Array.from({ length: sectionSize * 3 }, (_, index) => ({
        id: `skeleton-${index}`,
        title: "",
        artist: "",
        cover: null,
        index,
        isFavorite: false,
        isSkeleton: true,
        gradient:
          index % 2 === 0
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)"
            : "linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(14, 165, 233, 0.25) 100%)",
      })),
    [sectionSize],
  );

  const displayCards = isLoadingTracks ? skeletonCards : cards;
  const popularCards = displayCards.slice(0, sectionSize);
  const forYouCards = displayCards.slice(sectionSize, sectionSize * 2);
  const newReleaseCards = displayCards.slice(sectionSize * 2, sectionSize * 3);
  const playlistCards = playlists.slice(0, sectionSize);

  return (
    <>
      <div className="bg-gradient" />

      <div className="app">
        <Header />

        <div className="main-grid" ref={gridRef} style={gridStyle}>
          <HomeSidebar />
          <div
            className="resize-handle resize-handle--left"
            onPointerDown={onLeftResizeStart}
            aria-hidden="true"
          />

          <main className="main-content">
            <HomeHero isPlaying={isPlaying} onPlayToggle={handlePlayToggle} />

            <SectionGrid
              title="Популярное сейчас"
              cards={popularCards}
              onCardPlay={handleCardPlay}
              onToggleFavorite={toggleFavorite}
              currentTrackIndex={currentTrackIndex}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              hasTrackSelected={hasTrackSelected}
              onPlayToggle={handlePlayToggle}
            />

            {(isLoadingTracks || forYouCards.length > 0) && (
              <SectionGrid
                title="Для вас"
                cards={forYouCards}
                onCardPlay={handleCardPlay}
                onToggleFavorite={toggleFavorite}
                currentTrackIndex={currentTrackIndex}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                hasTrackSelected={hasTrackSelected}
                onPlayToggle={handlePlayToggle}
              />
            )}

            {(isLoadingTracks || newReleaseCards.length > 0) && (
              <SectionGrid
                title="Новые релизы"
                cards={newReleaseCards}
                onCardPlay={handleCardPlay}
                onToggleFavorite={toggleFavorite}
                currentTrackIndex={currentTrackIndex}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                hasTrackSelected={hasTrackSelected}
                onPlayToggle={handlePlayToggle}
              />
            )}

            {(playlistsLoading || playlistCards.length > 0 || playlistsError) && (
              <PlaylistSectionGrid
                title="Плейлисты для вас"
                playlists={playlistCards}
                isLoading={playlistsLoading}
                placeholderCount={sectionSize}
                emptyText={playlistsError ?? "Пока нет плейлистов"}
              />
            )}
          </main>

          <div
            className="resize-handle resize-handle--right"
            onPointerDown={onRightResizeStart}
            aria-hidden="true"
          />
          {currentTrack ? (
            <NowPlayingPanel
              currentTrack={currentTrack}
              queue={queueItems}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={handleTrackSelect}
            />
          ) : null}
        </div>

      </div>
    </>
  );
}
