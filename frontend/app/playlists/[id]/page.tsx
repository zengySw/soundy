"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header/Header";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import { apiFetch } from "@/lib/api";
import { useResizableSidebars } from "@/hooks/useResizableSidebars";
import TrackContextMenu from "@/components/tracks/TrackContextMenu";

type PlaylistTrack = {
  id: string;
  title: string;
  duration_ms: number | null;
  path: string | null;
  added_at?: string | null;
};

type PlaylistPayload = {
  id: string;
  name: string;
  description?: string | null;
  tracks: PlaylistTrack[];
};

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const playlistId = Array.isArray(rawId) ? rawId[0] : rawId;
  const {
    handleQueuePlay,
    handleTrackSelect,
    currentTrackIndex,
    hasTrackSelected,
    queue,
    tracks,
  } = usePlayer();
  const {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  } = useResizableSidebars();

  const [playlist, setPlaylist] = useState<PlaylistPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    item: {
      id: string;
      title: string;
      artist: string;
    };
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPlaylist = async () => {
      if (!playlistId) {
        return;
      }
      try {
        const res = await apiFetch(`/playlists/${playlistId}`);
        if (!res.ok) {
          if (res.status === 401) {
            setError("Войдите, чтобы смотреть плейлисты");
            return;
          }
          setError("Не удалось загрузить плейлист");
          return;
        }
        const data: PlaylistPayload = await res.json();
        if (mounted) {
          setPlaylist(data);
          setError(null);
        }
      } catch {
        if (mounted) {
          setError("Не удалось загрузить плейлист");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadPlaylist();
    return () => {
      mounted = false;
    };
  }, [playlistId]);

  const playlistQueue = useMemo(() => {
    if (!playlist) {
      return [];
    }
    const map = new Map<string, typeof tracks[number]>();
    tracks.forEach((track) => map.set(track.id, track));
    return playlist.tracks.map((item) => {
      const track = map.get(item.id);
      if (track) {
        return track;
      }
      return {
        id: item.id,
        title: item.title,
        artist: "Unknown artist",
        album: null,
        year: null,
        genre: null,
        durationMs: item.duration_ms ?? null,
        cover: null,
      };
    });
  }, [playlist, tracks]);

  const playlistItems = useMemo(
    () =>
      (playlist?.tracks ?? []).map((item, index) => {
        const track = tracks.find((t) => t.id === item.id);
        const durationMs = track?.durationMs ?? item.duration_ms ?? null;
        return {
          id: item.id,
          title: track?.title ?? item.title,
          artist: track?.artist ?? "Unknown artist",
          cover: track?.cover ?? null,
          durationMs,
          addedAt: item.added_at ?? null,
          order: index + 1,
        };
      }),
    [playlist, tracks],
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

  const handleRowPlay = (id: string) => {
    const index = playlistQueue.findIndex((item) => item.id === id);
    if (index < 0) {
      return;
    }
    handleQueuePlay(playlistQueue, index, "custom");
  };

  const handleRemoveFromPlaylist = async () => {
    if (!playlistId || !contextMenu) {
      return;
    }
    try {
      const res = await apiFetch(
        `/playlists/${playlistId}/tracks/${contextMenu.item.id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        return;
      }
      setPlaylist((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          tracks: prev.tracks.filter((track) => track.id !== contextMenu.item.id),
        };
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("soundy:playlist-track-removed", {
            detail: { playlistId },
          }),
        );
      }
    } catch {
      return;
    }
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
              <h1 className="favorites-hero-title">
                {playlist?.name ?? "Плейлист"}
              </h1>
              {playlist?.description ? (
                <p className="favorites-hero-subtitle">{playlist.description}</p>
              ) : (
                <p className="favorites-hero-subtitle">
                  Ваш персональный список треков.
                </p>
              )}
              <div className="favorites-hero-meta">
                <span>{playlistItems.length} треков</span>
              </div>
            </section>

            {loading ? (
              <div className="favorites-empty">Загружаю...</div>
            ) : error ? (
              <div className="favorites-empty">{error}</div>
            ) : playlistItems.length === 0 ? (
              <div className="favorites-empty">Плейлист пуст</div>
            ) : (
              <section className="favorites-list">
                <div className="favorites-row favorites-row--header">
                  <div className="favorites-cell favorites-index">#</div>
                  <div className="favorites-cell favorites-title">Трек</div>
                  <div className="favorites-cell favorites-added">Добавлено</div>
                  <div className="favorites-cell favorites-duration">Время</div>
                </div>
                {playlistItems.map((item) => (
                  <div
                    key={item.id}
                    className="favorites-row"
                    onClick={() => handleRowPlay(item.id)}
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
                  >
                    <div className="favorites-cell favorites-index">{item.order}</div>
                    <div className="favorites-cell favorites-title">
                      <div
                        className="favorites-cover"
                        style={{
                          background: item.cover
                            ? `url(${item.cover})`
                            : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <div className="favorites-meta">
                        <div className="favorites-track">{item.title}</div>
                        <div className="favorites-artist">{item.artist}</div>
                      </div>
                    </div>
                    <div className="favorites-cell favorites-added">
                      {item.addedAt
                        ? new Date(item.addedAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="favorites-cell favorites-duration">
                      {item.durationMs ? formatDuration(item.durationMs) : "—"}
                    </div>
                  </div>
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
        removeLabel="Удалить из плейлиста"
        onRemove={handleRemoveFromPlaylist}
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}
