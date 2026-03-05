"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlaylistCard = {
  id: string;
  name: string;
  track_count?: number | null;
};

type PlaylistSectionGridProps = {
  title: string;
  playlists: PlaylistCard[];
  isLoading?: boolean;
  placeholderCount?: number;
  emptyText?: string;
};

const gradients = [
  "linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(139, 92, 246, 0.7))",
  "linear-gradient(135deg, rgba(14, 165, 233, 0.7), rgba(20, 184, 166, 0.7))",
  "linear-gradient(135deg, rgba(236, 72, 153, 0.7), rgba(99, 102, 241, 0.7))",
  "linear-gradient(135deg, rgba(245, 158, 11, 0.7), rgba(239, 68, 68, 0.7))",
  "linear-gradient(135deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7))",
];

export default function PlaylistSectionGrid({
  title,
  playlists,
  isLoading = false,
  placeholderCount = 12,
  emptyText = "Пока нет плейлистов",
}: PlaylistSectionGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = gridRef.current;
    if (!el) {
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth - 1;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScrollLeft);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = gridRef.current;
    if (!el) {
      return;
    }
    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateScrollState, playlists.length, isLoading]);

  const handleScrollBy = (direction: "left" | "right") => {
    const el = gridRef.current;
    if (!el) {
      return;
    }
    const delta = direction === "left" ? -el.clientWidth : el.clientWidth;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const items = useMemo(() => {
    if (!isLoading) {
      return playlists.map((playlist, index) => ({
        ...playlist,
        gradient: gradients[index % gradients.length],
      }));
    }
    return Array.from({ length: placeholderCount }, (_, index) => ({
      id: `playlist-skeleton-${index}`,
      name: "",
      track_count: null,
      isSkeleton: true,
      gradient: gradients[index % gradients.length],
    }));
  }, [isLoading, playlists, placeholderCount]);

  return (
    <section className="section no-select">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <span className="see-all">Показать все →</span>
      </div>

      {items.length === 0 ? (
        <div className="section-empty">{emptyText}</div>
      ) : (
        <div className="grid-shell">
          <button
            className="grid-arrow grid-arrow--left"
            type="button"
            onClick={() => handleScrollBy("left")}
            disabled={!canScrollLeft}
            aria-label="Прокрутить влево"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <div className="grid" ref={gridRef}>
            {items.map((playlist, index) => {
              const isSkeleton = "isSkeleton" in playlist && playlist.isSkeleton;
              if (isSkeleton) {
                return (
                  <div key={playlist.id} className="card card--skeleton">
                    <div className="card-cover card-cover--skeleton" />
                    <div className="card-title skeleton-block skeleton-title" />
                    <div className="card-artist skeleton-block skeleton-artist" />
                  </div>
                );
              }

              const count =
                typeof playlist.track_count === "number"
                  ? `${playlist.track_count} треков`
                  : "Плейлист";
              return (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  className="card card--playlist"
                >
                  <div
                    className="card-cover"
                    style={{
                      background: playlist.gradient,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  <div className="card-title">{playlist.name}</div>
                  <div className="card-artist">{count}</div>
                </Link>
              );
            })}
          </div>
          <button
            className="grid-arrow grid-arrow--right"
            type="button"
            onClick={() => handleScrollBy("right")}
            disabled={!canScrollRight}
            aria-label="Прокрутить вправо"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
