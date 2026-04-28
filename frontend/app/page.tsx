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

type recommendation_item = {
  track_id: string;
  title: string;
  artist: string;
  genre: string | null;
  distance: number;
};

type recommendations_response = {
  user_id: string;
  items: recommendation_item[];
};

type playlist_item = {
  id: string;
  name: string;
  track_count?: number | null;
};

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

  const [playlists, setPlaylists] = useState<playlist_item[]>([]);
  const [playlists_loading, set_playlists_loading] = useState(true);
  const [playlists_error, set_playlists_error] = useState<string | null>(null);
  const [recommendation_items, set_recommendation_items] = useState<
    recommendation_item[]
  >([]);
  const [is_loading_recommendations, set_is_loading_recommendations] =
    useState(true);

  const queue_items = useMemo(
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

  const current_track = useMemo(
    () => queue_items[currentTrackIndex] ?? queue_items[0],
    [currentTrackIndex, queue_items],
  );

  const grid_style = useMemo(
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

  const section_size = 30;

  useEffect(() => {
    let mounted = true;

    const load_playlists = async () => {
      try {
        const res = await apiFetch("/playlists");
        if (!res.ok) {
          if (res.status === 401) {
            set_playlists_error("Войдите, чтобы видеть плейлисты");
          } else {
            set_playlists_error("Не удалось загрузить плейлисты");
          }
          return;
        }
        const data = await res.json();
        if (mounted) {
          setPlaylists(Array.isArray(data) ? data : []);
          set_playlists_error(null);
        }
      } catch {
        if (mounted) {
          set_playlists_error("Не удалось загрузить плейлисты");
        }
      } finally {
        if (mounted) {
          set_playlists_loading(false);
        }
      }
    };

    load_playlists();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const load_recommendations = async () => {
      try {
        if (mounted) {
          set_is_loading_recommendations(true);
        }
        const res = await apiFetch("/api/recommendations");
        if (!res.ok) {
          if (mounted) {
            set_recommendation_items([]);
          }
          return;
        }
        const payload = (await res.json()) as recommendations_response;
        if (mounted) {
          set_recommendation_items(Array.isArray(payload?.items) ? payload.items : []);
        }
      } catch {
        if (mounted) {
          set_recommendation_items([]);
        }
      } finally {
        if (mounted) {
          set_is_loading_recommendations(false);
        }
      }
    };

    load_recommendations();

    return () => {
      mounted = false;
    };
  }, []);

  const skeleton_cards = useMemo(
    () =>
      Array.from({ length: section_size * 3 }, (_, index) => ({
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
    [section_size],
  );

  const recommendation_cards = useMemo(() => {
    const track_index_by_id = new Map(
      tracks.map((track, index) => [track.id, index]),
    );

    return recommendation_items
      .map((item, order_index) => {
        const track_index = track_index_by_id.get(item.track_id);
        if (track_index === undefined) {
          return null;
        }

        const track = tracks[track_index];
        if (!track) {
          return null;
        }

        return {
          id: track.id,
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          index: track_index,
          isFavorite: favoriteIds.has(track.id),
          gradient:
            order_index % 2 === 0
              ? "linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
        };
      })
      .filter(
        (card): card is NonNullable<typeof card> =>
          card !== null,
      )
      .slice(0, section_size);
  }, [tracks, recommendation_items, favoriteIds, section_size]);

  const display_cards = isLoadingTracks ? skeleton_cards : cards;
  const popular_cards = display_cards.slice(0, section_size);
  const recommendation_display_cards = is_loading_recommendations
    ? skeleton_cards.slice(0, section_size)
    : recommendation_cards;
  const for_you_cards = display_cards.slice(section_size, section_size * 2);
  const new_release_cards = display_cards.slice(section_size * 2, section_size * 3);
  const playlist_cards = playlists.slice(0, section_size);

  return (
    <>
      <div className="bg-gradient" />

      <div className="app">
        <Header />

        <div className="main-grid" ref={gridRef} style={grid_style}>
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
              cards={popular_cards}
              onCardPlay={handleCardPlay}
              onToggleFavorite={toggleFavorite}
              currentTrackIndex={currentTrackIndex}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              hasTrackSelected={hasTrackSelected}
              onPlayToggle={handlePlayToggle}
            />

            {(is_loading_recommendations || recommendation_cards.length > 0) && (
              <SectionGrid
                title="Рекомендуем"
                cards={recommendation_display_cards}
                onCardPlay={handleCardPlay}
                onToggleFavorite={toggleFavorite}
                currentTrackIndex={currentTrackIndex}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                hasTrackSelected={hasTrackSelected}
                onPlayToggle={handlePlayToggle}
              />
            )}

            {(isLoadingTracks || for_you_cards.length > 0) && (
              <SectionGrid
                title="Для вас"
                cards={for_you_cards}
                onCardPlay={handleCardPlay}
                onToggleFavorite={toggleFavorite}
                currentTrackIndex={currentTrackIndex}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                hasTrackSelected={hasTrackSelected}
                onPlayToggle={handlePlayToggle}
              />
            )}

            {(isLoadingTracks || new_release_cards.length > 0) && (
              <SectionGrid
                title="Новые релизы"
                cards={new_release_cards}
                onCardPlay={handleCardPlay}
                onToggleFavorite={toggleFavorite}
                currentTrackIndex={currentTrackIndex}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                hasTrackSelected={hasTrackSelected}
                onPlayToggle={handlePlayToggle}
              />
            )}

            {(playlists_loading || playlist_cards.length > 0 || playlists_error) && (
              <PlaylistSectionGrid
                title="Плейлисты для вас"
                playlists={playlist_cards}
                isLoading={playlists_loading}
                placeholderCount={section_size}
                emptyText={playlists_error ?? "Пока нет плейлистов"}
              />
            )}
          </main>

          <div
            className="resize-handle resize-handle--right"
            onPointerDown={onRightResizeStart}
            aria-hidden="true"
          />
          {current_track ? (
            <NowPlayingPanel
              currentTrack={current_track}
              queue={queue_items}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={handleTrackSelect}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
