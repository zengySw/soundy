"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Header from "@/components/Header/Header";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import LibraryTrackCard from "@/components/library/LibraryTrackCard";
import { usePlayer } from "@/context/PlayerContext";
import { tracks } from "@/data/library";
import { formatDuration } from "@/utils/format";
import { useResizableSidebars } from "@/hooks/useResizableSidebars";

export default function LibraryPage() {
  const [, setCurrent] = useState<number | null>(null);
  const {
    handleTrackSelect,
    currentTrackIndex,
    hasTrackSelected,
    queue,
    tracks: playerTracks,
  } = usePlayer();
  const {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  } = useResizableSidebars();

  const queueItems = useMemo(() => {
    const activeQueue = queue.length ? queue : playerTracks;
    return activeQueue.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: formatDuration(track.durationMs),
      cover: track.cover ?? null,
    }));
  }, [queue, playerTracks]);

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

          <main className="page-main">
            <section className="page-hero library-hero">
              <div className="page-hero-badge">Коллекция</div>
              <h1 className="page-hero-title">Библиотека</h1>
              <p className="page-hero-subtitle">
                Все сохраненные треки и подборки, которые ты слушаешь чаще всего.
              </p>
            </section>

            <section className="library-grid">
              {tracks.map((track) => (
                <LibraryTrackCard
                  key={track.id}
                  track={track}
                  onSelect={setCurrent}
                />
              ))}
            </section>
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
    </>
  );
}
