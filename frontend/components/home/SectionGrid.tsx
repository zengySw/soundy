"use client";

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
  }>;
  onCardPlay: (index: number) => void;
  onToggleFavorite: (id: string) => void;
  currentTrackIndex?: number;
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
  isPlaying,
  hasTrackSelected,
  onPlayToggle,
}: SectionGridProps) {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <span className="see-all">Показать все →</span>
      </div>
      <div className="grid">
        {cards.map((card) => {
          const isActive =
            Boolean(hasTrackSelected) && currentTrackIndex === card.index;
          const isCardPlaying = isActive && Boolean(isPlaying);
          const handleSelect = () => {
            if (isActive && onPlayToggle) {
              onPlayToggle();
              return;
            }
            onCardPlay(card.index);
          };

          return (
            <div
              key={card.id}
              className="card"
              onClick={handleSelect}
            >
            <div
              className="card-cover"
              style={{
                background: card.cover ? `url(${card.cover})` : card.gradient,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
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
            </div>
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
            <div className="card-title">{card.title}</div>
            <div className="card-artist">{card.artist}</div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
