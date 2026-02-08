"use client";

interface NowPlayingPanelProps {
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    duration: string;
  };
  queue: Array<{
    id: string;
    title: string;
    artist: string;
    duration: string;
  }>;
  currentTrackIndex: number;
  onTrackSelect: (index: number) => void;
}

export default function NowPlayingPanel({
  currentTrack,
  queue,
  currentTrackIndex,
  onTrackSelect,
}: NowPlayingPanelProps) {
  return (
    <aside className="right-panel">
      <div className="panel-title">Сейчас играет</div>

      <div className="now-playing-cover">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>

      <div className="track-details">
        <div className="track-title">{currentTrack.title}</div>
        <div className="track-artist">{currentTrack.artist}</div>
      </div>

      <div className="actions">
        <button className="action-btn" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z" />
          </svg>
        </button>
        <button className="action-btn active" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
        <button className="action-btn" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
        </button>
      </div>

      <div className="queue">
        <div className="queue-title">Следующие</div>
        {queue.map((item, index) => (
          <div
            key={item.id}
            className={`queue-item${index === currentTrackIndex ? " current" : ""}`}
            onClick={() => onTrackSelect(index)}
          >
            <div className="queue-cover" />
            <div className="queue-info">
              <div className="queue-name">{item.title}</div>
              <div className="queue-artist">{item.artist}</div>
            </div>
            <div className="queue-duration">{item.duration}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
