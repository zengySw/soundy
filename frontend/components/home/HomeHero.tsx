"use client";

interface HomeHeroProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
}

export default function HomeHero({ isPlaying, onPlayToggle }: HomeHeroProps) {
  return (
    <section className="hero">
      <div className="hero-content no-select">
        <div className="hero-badge">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          Новинка недели
        </div>
        <h1 className="hero-title">
          Откройте для себя
          <br />
          новую музыку
        </h1>
        <p className="hero-description">
          Персональные рекомендации на основе ваших музыкальных
          предпочтений. Слушайте лучшие треки и находите новых
          исполнителей.
        </p>
        <button className="hero-button" type="button" onClick={onPlayToggle}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isPlaying ? (
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
          Начать слушать
        </button>
      </div>
    </section>
  );
}
