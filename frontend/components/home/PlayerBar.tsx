"use client";

import type { MouseEvent, RefObject } from "react";

interface PlayerBarProps {
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    duration: string;
  } | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  isMuted: boolean;
  progressRef: RefObject<HTMLDivElement>;
  volumeRef: RefObject<HTMLDivElement>;
  onPlayToggle: () => void;
  onProgressClick: (event: MouseEvent<HTMLDivElement>) => void;
  onVolumeClick: (event: MouseEvent<HTMLDivElement>) => void;
  onVolumeChange?: (value: number) => void;
  onMuteToggle?: () => void;
}

export default function PlayerBar({
  currentTrack,
  isPlaying,
  progress,
  volume,
  isMuted,
  progressRef,
  volumeRef,
  onPlayToggle,
  onProgressClick,
  onVolumeClick,
  onVolumeChange,
  onMuteToggle,
}: PlayerBarProps) {
  const title = currentTrack ? currentTrack.title : "no track played";
  const artist = currentTrack ? currentTrack.artist : "";

  return (
    <div className="player">
      <div className="player-info">
        <div className="player-cover" />
        <div className="player-meta">
          <h4>{title}</h4>
          {artist ? <p>{artist}</p> : null}
        </div>
      </div>

      <div className="player-controls">
        <div className="controls">
          <button className="control" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button className="play-control" type="button" onClick={onPlayToggle}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {isPlaying ? (
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              ) : (
                <path d="M8 5v14l11-7z" />
              )}
            </svg>
          </button>
          <button className="control" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 18h2V6h-2zm-11 0l8.5-6L5 6z" />
            </svg>
          </button>
        </div>

        <div className="progress-container">
          <span className="time">1:32</span>
          <div className="progress-bar" ref={progressRef} onClick={onProgressClick}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="time">3:20</span>
        </div>
      </div>

      <div className="player-extras">
        <button className="control" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
        <div className="volume-section">
          <button className="control" type="button" onClick={onMuteToggle}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {isMuted || volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.18l2.18 2.18c.2-.4.32-.85.32-1.33zM19 12c0 .93-.24 1.8-.66 2.56l1.46 1.46C20.55 14.8 21 13.45 21 12c0-3.04-1.66-5.64-4.13-7.03l-1.45 1.45C17.59 7.62 19 9.68 19 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.73 4.73L18 16.73 7.27 6 4.27 3z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              )}
            </svg>
          </button>
          <input
            className="volume-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(event) => onVolumeChange?.(Number(event.target.value))}
            aria-label="Volume"
          />
        </div>
        <button className="control" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
