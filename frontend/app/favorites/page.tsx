"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header/Header";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import { apiFetch } from "@/lib/api";

type FavoriteTrack = {
  id: string;
  title: string;
  duration_ms: number | null;
  path: string | null;
  added_at?: string | null;
};

export default function FavoritesPage() {
  const { handleCardPlay, tracks } = usePlayer();
  const [favorites, setFavorites] = useState<FavoriteTrack[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const loadFavorites = async () => {
      try {
        const res = await apiFetch("/favorites");
        if (!res.ok) {
          return;
        }
        const data: FavoriteTrack[] = await res.json();
        if (mounted) {
          setFavorites(data);
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
      setFavorites((prev) => prev.filter((item) => item.id !== id));
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

  const trackIndexById = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((track, index) => {
      map.set(track.id, index);
    });
    return map;
  }, [tracks]);

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
    const index = trackIndexById.get(id);
    if (index === undefined || index < 0) {
      return;
    }
    handleCardPlay(index);
  };

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

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
                <div
                  key={item.id}
                  className="favorites-row"
                  onClick={() => handleRowPlay(item.id)}
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
                    {formatAddedAt(item.addedAt)}
                  </div>
                  <div className="favorites-cell favorites-duration">
                    <span>
                      {item.durationMs ? formatDuration(item.durationMs) : "—"}
                    </span>
                    <button
                      className="favorites-like"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleFavorite(item.id);
                      }}
                      aria-label="Убрать из избранного"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </>
  );
}
