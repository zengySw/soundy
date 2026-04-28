"use client";

import type { CSSProperties, DragEvent, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCoverGlow } from "@/hooks/useCoverGlow";
import { use_track_preview } from "@/hooks/use_track_preview";
import TrackContextMenu from "@/components/tracks/TrackContextMenu";

interface SectionGridProps {
  title: string;
  cards: Array<{
    id: string;
    title: string;
    artist: string;
    cover: string | null;
    gradient: string;
    index: number;
    isFavorite: boolean;
    isSkeleton?: boolean;
  }>;
  onCardPlay: (index: number) => void;
  onToggleFavorite: (id: string) => void;
  currentTrackIndex?: number;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  hasTrackSelected?: boolean;
  onPlayToggle?: () => void;
}

export default function SectionGrid({
  title,
  cards,
  onCardPlay,
  onToggleFavorite,
  currentTrackIndex,
  currentTrackId,
  isPlaying,
  hasTrackSelected,
  onPlayToggle,
}: SectionGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    card: SectionGridProps["cards"][number];
    position: { x: number; y: number };
  } | null>(null);

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
  }, [updateScrollState, cards.length]);

  const handleScrollBy = (direction: "left" | "right") => {
    const el = gridRef.current;
    if (!el) {
      return;
    }
    const delta = direction === "left" ? -el.clientWidth : el.clientWidth;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };
  const handleContextMenu = (
    event: MouseEvent<HTMLDivElement>,
    card: SectionGridProps["cards"][number],
  ) => {
    if (card.isSkeleton) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ card, position: { x: event.clientX, y: event.clientY } });
  };

  return (
    <section className="section no-select">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <span className="see-all">Показать все →</span>
      </div>
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
          {cards.map((card) => (
            <TrackCard
              key={card.id}
              card={card}
              currentTrackIndex={currentTrackIndex}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              hasTrackSelected={hasTrackSelected}
              onPlayToggle={onPlayToggle}
              onCardPlay={onCardPlay}
              onToggleFavorite={onToggleFavorite}
              onContextMenu={handleContextMenu}
            />
          ))}
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
      <TrackContextMenu
        open={Boolean(contextMenu)}
        position={contextMenu?.position ?? null}
        track={
          contextMenu
            ? {
                id: contextMenu.card.id,
                title: contextMenu.card.title,
                artist: contextMenu.card.artist,
              }
            : null
        }
        isFavorite={contextMenu?.card.isFavorite}
        onPlay={
          contextMenu
            ? () => {
                onCardPlay(contextMenu.card.index);
              }
            : undefined
        }
        onToggleFavorite={
          contextMenu
            ? () => {
                onToggleFavorite(contextMenu.card.id);
              }
            : undefined
        }
        onClose={() => setContextMenu(null)}
      />
    </section>
  );
}

type TrackCardProps = {
  card: SectionGridProps["cards"][number];
  currentTrackIndex?: number;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  hasTrackSelected?: boolean;
  onPlayToggle?: () => void;
  onCardPlay: (index: number) => void;
  onToggleFavorite: (id: string) => void;
  onContextMenu: (
    event: MouseEvent<HTMLDivElement>,
    card: SectionGridProps["cards"][number],
  ) => void;
};

function TrackCard({
  card,
  currentTrackIndex,
  currentTrackId,
  isPlaying,
  hasTrackSelected,
  onPlayToggle,
  onCardPlay,
  onToggleFavorite,
  onContextMenu,
}: TrackCardProps) {
  const glow = useCoverGlow(card.cover);
  const isSkeleton = Boolean(card.isSkeleton);
  const isActive = isSkeleton
    ? false
    : currentTrackId
      ? currentTrackId === card.id
      : Boolean(hasTrackSelected) && currentTrackIndex === card.index;
  const isCardPlaying = isActive && Boolean(isPlaying);
  const {
    on_mouse_enter,
    on_mouse_leave,
    is_preview_loading,
    is_preview_playing,
  } = use_track_preview({
    track_id: isSkeleton ? null : card.id,
    enabled: !isSkeleton && !isCardPlaying,
    preview_start_sec: 30,
    hover_delay_ms: 800,
    fade_in_ms: 300,
    fade_out_ms: 200,
  });
  const handleSelect = () => {
    if (isSkeleton) {
      return;
    }
    if (isActive && onPlayToggle) {
      onPlayToggle();
      return;
    }
    onCardPlay(card.index);
  };
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (isSkeleton) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    event.dataTransfer.setData("application/x-soundy-track", card.id);
    const url = new URL("/", window.location.origin);
    url.searchParams.set("play", card.id);
    const shareUrl = url.toString();
    event.dataTransfer.setData("text/uri-list", shareUrl);
    event.dataTransfer.setData("text/plain", shareUrl);
    event.dataTransfer.effectAllowed = "copyLink";
  };
  const coverStyle: CSSProperties | undefined = isSkeleton
    ? undefined
    : {
        background: card.cover ? `url(${card.cover})` : card.gradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...(glow ? ({ "--cover-glow": glow } as CSSProperties) : null),
      };

  return (
    <div
      className={`card${isSkeleton ? " card--skeleton" : ""}`}
      onClick={isSkeleton ? undefined : handleSelect}
      onContextMenu={(event) => onContextMenu(event, card)}
      onMouseEnter={on_mouse_enter}
      onMouseLeave={on_mouse_leave}
      draggable={!isSkeleton}
      onDragStart={handleDragStart}
    >
      <div
        className={`card-cover${isSkeleton ? " card-cover--skeleton" : ""}${
          glow ? " cover-glow" : ""
        }`}
        style={coverStyle}
      >
        {!isSkeleton && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        )}
        {!isSkeleton && (is_preview_playing || is_preview_loading) && (
          <div
            className={`card-preview-bars${is_preview_loading ? " is-loading" : ""}`}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
        {!isSkeleton && (
          <button
            className={`card-play${isCardPlaying ? " active" : ""}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSelect();
            }}
            aria-label={isCardPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isCardPlaying ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {!isSkeleton && (
        <button
          className={`card-favorite${card.isFavorite ? " active" : ""}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(card.id);
          }}
          aria-label="Favorite"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      )}
      {isSkeleton ? (
        <>
          <div className="card-title skeleton-block skeleton-title" />
          <div className="card-artist skeleton-block skeleton-artist" />
        </>
      ) : (
        <>
          <div className="card-title">{card.title}</div>
          <div className="card-artist">{card.artist}</div>
        </>
      )}
    </div>
  );
}
