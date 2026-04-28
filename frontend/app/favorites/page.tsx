"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import Header from "@/components/Header/Header";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import { apiFetch } from "@/lib/api";
import { useResizableSidebars } from "@/hooks/useResizableSidebars";
import { readJson, writeJson } from "@/lib/storage";
import { useCoverGlow } from "@/hooks/useCoverGlow";
import TrackContextMenu from "@/components/tracks/TrackContextMenu";

type FavoriteTrack = {
  id: string;
  title: string;
  duration_ms: number | null;
  path: string | null;
  added_at?: string | null;
};

const FAVORITES_CACHE_KEY = "soundy.favorites.v1";
const MAX_OFFLINE_TRACKS = 5;

export default function FavoritesPage() {
  const {
    handleQueuePlay,
    handleTrackSelect,
    currentTrackIndex,
    hasTrackSelected,
    queue,
    tracks,
    favoriteIds,
    favoritesReady,
    toggleFavorite,
    isGuest,
  } = usePlayer();
  const {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  } = useResizableSidebars();
  const [favorites, setFavorites] = useState<FavoriteTrack[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    item: {
      id: string;
      title: string;
      artist: string;
    };
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (favorites.length > 0) {
      writeJson(FAVORITES_CACHE_KEY, favorites);
    }
  }, [favorites]);

  useEffect(() => {
    let mounted = true;
    const loadFavorites = async () => {
      try {
        if (isGuest) {
          if (mounted) {
            setFavorites([]);
          }
          return;
        }
        const res = await apiFetch("/favorites");
        if (!res.ok) {
          return;
        }
        const data: FavoriteTrack[] = await res.json();
        if (mounted) {
          setFavorites(data);
          writeJson(FAVORITES_CACHE_KEY, data);
        }
      } catch {
        if (mounted) {
          const cached = readJson<FavoriteTrack[]>(FAVORITES_CACHE_KEY);
          if (cached?.length) {
            const limited = cached.slice(0, MAX_OFFLINE_TRACKS);
            setFavorites(limited);
          }
        }
      }
    };

    loadFavorites();
    return () => {
      mounted = false;
    };
  }, [isGuest]);

  useEffect(() => {
    if (!favoritesReady) {
      return;
    }
    setFavorites((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      const next = prev.filter((item) => favoriteIds.has(item.id));
      const missingIds: string[] = [];
      favoriteIds.forEach((id) => {
        if (!byId.has(id)) {
          missingIds.push(id);
        }
      });
      if (missingIds.length === 0 && next.length === prev.length) {
        return prev;
      }
      const now = new Date().toISOString();
      const trackById = new Map(tracks.map((track) => [track.id, track]));
      missingIds.forEach((id) => {
        const track = trackById.get(id);
        next.unshift({
          id,
          title: track?.title ?? "Unknown track",
          duration_ms: track?.durationMs ?? null,
          path: null,
          added_at: now,
        });
      });
      return next;
    });
  }, [favoriteIds, favoritesReady, tracks, favorites]);

  const favoriteQueue = useMemo(() => {
    const map = new Map<string, typeof tracks[number]>();
    tracks.forEach((track) => {
      map.set(track.id, track);
    });
    return favorites.map((favorite) => {
      const track = map.get(favorite.id);
      if (track) {
        return track;
      }
      return {
        id: favorite.id,
        title: favorite.title,
        artist: "Unknown artist",
        album: null,
        year: null,
        genre: null,
        durationMs: favorite.duration_ms ?? null,
        cover: null,
      };
    });
  }, [favorites, tracks]);

  const favoriteItems = useMemo(
    () =>
      favorites.map((favorite, index) => {
        const track = tracks.find((item) => item.id === favorite.id);
        const durationMs = track?.durationMs ?? favorite.duration_ms ?? null;
        return {
          id: favorite.id,
          title: track?.title ?? favorite.title,
          artist: track?.artist ?? "Unknown artist",
          cover: track?.cover ?? null,
          durationMs,
          addedAt: favorite.added_at ?? null,
          order: index + 1,
        };
      }),
    [favorites, tracks],
  );

  const queueItems = useMemo(() => {
    const activeQueue = queue.length ? queue : tracks;
    return activeQueue.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: formatDuration(track.durationMs),
      cover: track.cover ?? null,
    }));
  }, [queue, tracks]);

  const currentTrack = useMemo(() => {
    if (!hasTrackSelected) {
      return null;
    }
    return queueItems[currentTrackIndex] ?? queueItems[0] ?? null;
  }, [hasTrackSelected, currentTrackIndex, queueItems]);

  const gridStyle = useMemo(
    () =>
      ({
        "--sidebar-left": `${leftWidth}px`,
        "--sidebar-right": `${rightWidth}px`,
      }) as CSSProperties,
    [leftWidth, rightWidth],
  );

  const formatAddedAt = (value: string | null) => {
    if (!value) {
      return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleRowPlay = (id: string) => {
    const index = favoriteQueue.findIndex((item) => item.id === id);
    if (index < 0) {
      return;
    }
    handleQueuePlay(favoriteQueue, index, "favorites");
  };

  const handleRemoveFavorite = () => {
    if (!contextMenu) {
      return;
    }
    toggleFavorite(contextMenu.item.id);
  };

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

          <main className="favorites-main">
            <section className="favorites-hero">
              <div className="favorites-hero-badge">Плейлист</div>
              <h1 className="favorites-hero-title">Избранное</h1>
              <p className="favorites-hero-subtitle">
                Все треки, которые ты отметил сердцем.
              </p>
              <div className="favorites-hero-meta">
                <span>{favoriteItems.length} треков</span>
              </div>
            </section>

            {favorites.length === 0 ? (
              <div className="favorites-empty">Пока пусто</div>
            ) : (
              <section className="favorites-list">
                <div className="favorites-row favorites-row--header">
                  <div className="favorites-cell favorites-index">#</div>
                  <div className="favorites-cell favorites-title">Трек</div>
                  <div className="favorites-cell favorites-added">Добавлено</div>
                  <div className="favorites-cell favorites-duration">Время</div>
                </div>
                {favoriteItems.map((item) => (
                  <FavoriteRow
                    key={item.id}
                    item={item}
                    onPlay={handleRowPlay}
                    onToggleFavorite={toggleFavorite}
                    formatAddedAt={formatAddedAt}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setContextMenu({
                        item: {
                          id: item.id,
                          title: item.title,
                          artist: item.artist,
                        },
                        position: { x: event.clientX, y: event.clientY },
                      });
                    }}
                  />
                ))}
              </section>
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
      <TrackContextMenu
        open={Boolean(contextMenu)}
        position={contextMenu?.position ?? null}
        track={contextMenu?.item ?? null}
        onPlay={
          contextMenu
            ? () => {
                handleRowPlay(contextMenu.item.id);
              }
            : undefined
        }
        removeLabel="Удалить из избранного"
        onRemove={handleRemoveFavorite}
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}

type FavoriteItem = {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  durationMs: number | null;
  addedAt: string | null;
  order: number;
};

function FavoriteRow({
  item,
  onPlay,
  onToggleFavorite,
  formatAddedAt,
  onContextMenu,
}: {
  item: FavoriteItem;
  onPlay: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  formatAddedAt: (value: string | null) => string;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const glow = useCoverGlow(item.cover);
  return (
    <div
      className="favorites-row"
      onClick={() => onPlay(item.id)}
      onContextMenu={onContextMenu}
    >
      <div className="favorites-cell favorites-index">{item.order}</div>
      <div className="favorites-cell favorites-title">
        <div
          className={`favorites-cover${glow ? " cover-glow" : ""}`}
          style={{
            background: item.cover
              ? `url(${item.cover})`
              : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            ...(glow ? ({ "--cover-glow": glow } as CSSProperties) : null),
          }}
        />
        <div className="favorites-meta">
          <div className="favorites-track">{item.title}</div>
          <div className="favorites-artist">{item.artist}</div>
        </div>
      </div>
      <div className="favorites-cell favorites-added">
        {formatAddedAt(item.addedAt)}
      </div>
      <div className="favorites-cell favorites-duration">
        <span>{item.durationMs ? formatDuration(item.durationMs) : "—"}</span>
        <button
          className="favorites-like"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(item.id);
          }}
          aria-label="Убрать из избранного"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
