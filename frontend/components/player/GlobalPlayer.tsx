"use client";

import { useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
import PlayerBar from "@/components/home/PlayerBar";
import { formatDuration } from "@/utils/format";

export default function GlobalPlayer() {
  const {
    isPlaying,
    progress,
    volume,
    isMuted,
    currentTrackIndex,
    hasTrackSelected,
    tracks,
    queue,
    repeatMode,
    isGuest,
    favoriteIds,
    currentTimeMs,
    durationMs,
    shareTrackId,
    sharePromptOpen,
    allowSharePlaybackAsGuest,
    dismissSharePrompt,
    needsUserGesture,
    progressRef,
    volumeRef,
    handleProgressClick,
    handleVolumeClick,
    handleVolumeChange,
    handleMuteToggle,
    handlePlayToggle,
    handleNext,
    handlePrev,
    handleRepeatToggle,
    toggleFavorite,
  } = usePlayer();

  const sharedTrack = shareTrackId
    ? tracks.find((track) => track.id === shareTrackId)
    : null;

  const handleRegister = () => {
    if (typeof window === "undefined") {
      return;
    }
    const next = window.location.pathname + window.location.search;
    const target = `/auth/registration?next=${encodeURIComponent(next)}`;
    window.location.href = target;
  };

  const currentTrack = useMemo(() => {
    if (!hasTrackSelected) {
      return null;
    }
    const activeQueue = queue.length ? queue : tracks;
    const track = activeQueue[currentTrackIndex] ?? activeQueue[0] ?? null;
    if (!track) {
      return null;
    }
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: formatDuration(durationMs ?? track.durationMs),
      currentTime: formatDuration(currentTimeMs),
      cover: track.cover ?? null,
      isAd: track.isAd ?? false,
    };
  }, [
    currentTrackIndex,
    hasTrackSelected,
    queue,
    tracks,
    durationMs,
    currentTimeMs,
  ]);

  const isFavorite = currentTrack
    ? favoriteIds.has(currentTrack.id)
    : false;

  return (
    <>
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        volume={volume}
        isMuted={isMuted}
        progressRef={progressRef}
        volumeRef={volumeRef}
        onPlayToggle={handlePlayToggle}
        onProgressClick={handleProgressClick}
        onVolumeClick={handleVolumeClick}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onNext={handleNext}
        onPrev={handlePrev}
      repeatMode={repeatMode}
      onRepeatToggle={handleRepeatToggle}
      isFavorite={isFavorite}
      isFavoriteDisabled={!currentTrack || currentTrack.isAd || isGuest}
      onFavoriteToggle={
        currentTrack ? () => toggleFavorite(currentTrack.id) : undefined
      }
      needsUserGesture={needsUserGesture}
    />

      {sharePromptOpen ? (
        <div className="share-modal-overlay" role="presentation">
          <div className="share-modal" role="dialog" aria-modal="true">
            <div className="share-modal-title">
              Слушать трек по ссылке
            </div>
            <div className="share-modal-text">
              {sharedTrack
                ? `Трек “${sharedTrack.title}” можно слушать как гость, но лучше создать аккаунт, чтобы сохранить историю и избранное.`
                : "Можно слушать как гость, но лучше создать аккаунт, чтобы сохранить историю и избранное."}
            </div>
            <div className="share-modal-actions">
              <button
                type="button"
                className="share-modal-button ghost"
                onClick={allowSharePlaybackAsGuest}
              >
                Остаться гостем
              </button>
              <button
                type="button"
                className="share-modal-button primary"
                onClick={handleRegister}
              >
                Зарегистрироваться
              </button>
              <button
                type="button"
                className="share-modal-close"
                onClick={dismissSharePrompt}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
