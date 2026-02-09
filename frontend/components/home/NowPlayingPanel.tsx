"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useState } from "react";
import { useCoverGlow } from "@/hooks/useCoverGlow";
import { usePlayer } from "@/context/PlayerContext";
import TrackContextMenu from "@/components/tracks/TrackContextMenu";

interface NowPlayingPanelProps {
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    duration: string;
    cover?: string | null;
  };
  queue: Array<{
    id: string;
    title: string;
    artist: string;
    duration: string;
    cover?: string | null;
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
  const { favoriteIds, toggleFavorite } = usePlayer();
  const [contextMenu, setContextMenu] = useState<{
    item: { id: string; title: string; artist: string };
    index: number;
    position: { x: number; y: number };
  } | null>(null);
  const coverGlow = useCoverGlow(currentTrack.cover);
  const coverStyle = currentTrack.cover
    ? {
        backgroundImage: `url(${currentTrack.cover})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...(coverGlow ? ({ "--cover-glow": coverGlow } as CSSProperties) : null),
      }
    : undefined;

  const handleContextMenu = (
    event: MouseEvent<HTMLDivElement>,
    item: { id: string; title: string; artist: string },
    index: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ item, index, position: { x: event.clientX, y: event.clientY } });
  };

  return (
    <>
      <aside className="right-panel">
      <div className="panel-title">Сейчас играет</div>

      <div
        className={`now-playing-cover${coverGlow ? " cover-glow" : ""}`}
        style={coverStyle}
        onContextMenu={(event) =>
          handleContextMenu(
            event,
            { id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist },
            currentTrackIndex,
          )
        }
      >
        {!currentTrack.cover && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        )}
      </div>

      <div
        className="track-details"
        onContextMenu={(event) =>
          handleContextMenu(
            event,
            { id: currentTrack.id, title: currentTrack.title, artist: currentTrack.artist },
            currentTrackIndex,
          )
        }
      >
        <div className="track-title">{currentTrack.title}</div>
        <div className="track-artist">{currentTrack.artist}</div>
      </div>

      <div className="queue">
        <div className="queue-title">Следующие</div>
        {queue.map((item, index) => (
          <div
            key={item.id}
            className={`queue-item${index === currentTrackIndex ? " current" : ""}`}
            onClick={() => onTrackSelect(index)}
            onContextMenu={(event) =>
              handleContextMenu(
                event,
                { id: item.id, title: item.title, artist: item.artist },
                index,
              )
            }
          >
            <div
              className="queue-cover"
              style={
                item.cover
                  ? {
                      backgroundImage: `url(${item.cover})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            />
            <div className="queue-info">
              <div className="queue-name">{item.title}</div>
              <div className="queue-artist">{item.artist}</div>
            </div>
            <div className="queue-duration">{item.duration}</div>
          </div>
        ))}
      </div>
      </aside>
      <TrackContextMenu
        open={Boolean(contextMenu)}
        position={contextMenu?.position ?? null}
        track={contextMenu?.item ?? null}
        isFavorite={
          contextMenu ? favoriteIds.has(contextMenu.item.id) : false
        }
        onPlay={
          contextMenu
            ? () => {
                onTrackSelect(contextMenu.index);
              }
            : undefined
        }
        onToggleFavorite={
          contextMenu
            ? () => {
                toggleFavorite(contextMenu.item.id);
              }
            : undefined
        }
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}
