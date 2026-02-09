"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { getPercentFromPointer } from "@/utils/slider";
import type { Track } from "@/types/track";
import { apiFetch } from "@/lib/api";
import { readJson, writeJson } from "@/lib/storage";

type RepeatMode = "off" | "all" | "one";
type QueueSource = "library" | "favorites" | "custom";

const TRACKS_CACHE_KEY = "soundy.tracks.v1";
const FAVORITES_CACHE_KEY = "soundy.favorites.v1";
const MAX_OFFLINE_TRACKS = 5;
const AD_INTERVAL = 8;

export function usePlayerControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(65);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [hasTrackSelected, setHasTrackSelected] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueSource, setQueueSource] = useState<QueueSource>("library");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [isGuest, setIsGuest] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(65);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [shareTrackId, setShareTrackId] = useState<string | null>(null);
  const [sharePromptOpen, setSharePromptOpen] = useState(false);
  const [shareGuestAllowed, setShareGuestAllowed] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const favoriteIdsRef = useRef<Set<string>>(new Set());
  const readTracksCache = useCallback(() => {
    const cached = readJson<Track[]>(TRACKS_CACHE_KEY);
    return Array.isArray(cached) ? cached : null;
  }, []);

  const writeTracksCache = useCallback((data: Track[]) => {
    if (!writeJson(TRACKS_CACHE_KEY, data)) {
      writeJson(TRACKS_CACHE_KEY, data.slice(0, 50));
    }
  }, []);

  const buildQueueWithAds = useCallback(
    (baseQueue: Track[]) => {
      if (!isGuest) {
        return { queue: baseQueue, mapIndex: (index: number) => index };
      }
      if (baseQueue.length === 0) {
        return { queue: baseQueue, mapIndex: (index: number) => index };
      }
      const queueWithAds: Track[] = [];
      let adCount = 0;
      baseQueue.forEach((track, index) => {
        queueWithAds.push(track);
        if ((index + 1) % AD_INTERVAL === 0) {
          adCount += 1;
          queueWithAds.push({
            id: `ad-${adCount}`,
            title: "Небольшая пауза",
            artist: "Soundy",
            album: null,
            year: null,
            genre: null,
            durationMs: null,
            cover: null,
            isAd: true,
          });
        }
      });
      const mapIndex = (index: number) =>
        index + Math.floor(index / AD_INTERVAL);
      return { queue: queueWithAds, mapIndex };
    },
    [isGuest],
  );
  const safePlay = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setNeedsUserGesture(false);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      if (err?.name === "NotAllowedError") {
        setIsPlaying(false);
        setNeedsUserGesture(true);
        return;
      }
      console.error("Audio play error:", err);
      setIsPlaying(false);
    }
  }, []);

  const attemptAutoplay = useCallback(() => {
    if (!audioRef.current || !hasTrackSelected || isPlaying) {
      return;
    }
    if (!audioRef.current.src) {
      return;
    }
    void safePlay();
  }, [hasTrackSelected, isPlaying, safePlay]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!needsUserGesture) {
      return;
    }
    const handleGesture = () => {
      attemptAutoplay();
    };
    window.addEventListener("pointerdown", handleGesture);
    window.addEventListener("keydown", handleGesture);
    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, [needsUserGesture, attemptAutoplay]);

  const clearShareParam = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("play");
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState({}, "", next);
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
    audioRef.current.volume = volume / 100;

    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      const duration = audio.duration;
      if (Number.isFinite(duration) && duration > 0) {
        setProgress((audio.currentTime / duration) * 100);
        setDurationMs(Math.round(duration * 1000));
      }
      setCurrentTimeMs(Math.round(audio.currentTime * 1000));
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationMs(Math.round(audio.duration * 1000));
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleLoadedMetadata);
      audio.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);



  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = localStorage.getItem("playerVolume");
    const parsed = saved ? Number(saved) : NaN;
    if (Number.isFinite(parsed)) {
      setVolume(Math.min(Math.max(parsed, 0), 100));
    }
    const savedMuted = localStorage.getItem("playerMuted");
    setIsMuted(savedMuted === "1");
    const savedLast = localStorage.getItem("playerLastVolume");
    const parsedLast = savedLast ? Number(savedLast) : NaN;
    if (Number.isFinite(parsedLast)) {
      setLastVolume(Math.min(Math.max(parsedLast, 0), 100));
    }
    const savedRepeat = localStorage.getItem("playerRepeatMode");
    if (savedRepeat === "off" || savedRepeat === "all" || savedRepeat === "one") {
      setRepeatMode(savedRepeat);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAuth = async () => {
      try {
        const res = await apiFetch("/auth/me");
        if (!mounted) {
          return;
        }
        setIsGuest(!res.ok);
      } catch {
        if (mounted) {
          setIsGuest(true);
        }
      }
    };
    loadAuth();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get("play");
    if (sharedId) {
      setShareTrackId(sharedId);
    }
  }, []);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  useEffect(() => {
    if (isGuest) {
      setFavoriteIds(new Set());
      setFavoritesReady(true);
      return;
    }
    setFavoritesReady(false);
    let mounted = true;
    const loadFavorites = async () => {
      try {
        const res = await apiFetch("/favorites");
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setFavoriteIds(new Set(data.map((item) => item.id)));
        }
      } catch {
        if (mounted) {
          const cached = readJson<Array<{ id: string }>>(FAVORITES_CACHE_KEY);
          if (cached?.length) {
            setFavoriteIds(new Set(cached.map((item) => item.id)));
          }
        }
      } finally {
        if (mounted) {
          setFavoritesReady(true);
        }
      }
    };
    loadFavorites();
    return () => {
      mounted = false;
    };
  }, [isGuest]);


  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    if (typeof window !== "undefined") {
      localStorage.setItem("playerVolume", String(Math.round(volume)));
      localStorage.setItem("playerMuted", isMuted ? "1" : "0");
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("playerRepeatMode", repeatMode);
    }
  }, [repeatMode]);

  useEffect(() => {
    let mounted = true;

    const loadTracks = async () => {
      try {
        if (mounted) {
          setIsLoadingTracks(true);
        }
        const cached = readTracksCache();
        if (typeof navigator !== "undefined" && !navigator.onLine && cached?.length) {
          if (mounted) {
            setTracks(cached.slice(0, MAX_OFFLINE_TRACKS));
            setIsLoadingTracks(false);
          }
          return;
        }
        const res = await apiFetch("/tracks");
        if (!res.ok) {
          throw new Error("Не удалось загрузить треки");
        }
        const data: Track[] = await res.json();
        if (mounted) {
          setTracks(data);
          writeTracksCache(data);
        }
      } catch {
        if (mounted) {
          const cached = readTracksCache();
          if (cached?.length) {
            setTracks(cached.slice(0, MAX_OFFLINE_TRACKS));
          } else {
            setTracks([]);
          }
        }
      } finally {
        if (mounted) {
          setIsLoadingTracks(false);
        }
      }
    };

    loadTracks();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (queueSource !== "library") {
      return;
    }
    const { queue: nextQueue } = buildQueueWithAds(tracks);
    setQueue(nextQueue);
  }, [tracks, queueSource, buildQueueWithAds]);

  const playTrack = useCallback(async (track: Track) => {
    if (!audioRef.current) {
      return;
    }

    try {
      const streamPath = track.isAd
        ? "/tracks/ads/stream"
        : `/tracks/${track.id}/stream`;
      const res = await apiFetch(streamPath);
      if (!res.ok) {
        throw new Error("Не удалось загрузить аудио");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = url;
      audioRef.current.src = url;
      await safePlay();
    } catch (err) {
      console.error("Play track error:", err);
      setIsPlaying(false);
    }
  }, [safePlay]);

  const handleProgressClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !audioRef.current) {
        return;
      }
      const next = getPercentFromPointer(event.clientX, progressRef.current);
      setProgress(next);
      if (audioRef.current.duration) {
        audioRef.current.currentTime =
          (next / 100) * audioRef.current.duration;
        setCurrentTimeMs(Math.round(audioRef.current.currentTime * 1000));
      }
    },
    [],
  );

  const handleVolumeClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!volumeRef.current) {
        return;
      }
      const next = getPercentFromPointer(event.clientX, volumeRef.current);
      setVolume(next);
    },
    [],
  );

  const handleVolumeChange = useCallback((value: number) => {
    const next = Math.min(Math.max(value, 0), 100);
    setVolume(next);
    if (next > 0) {
      setLastVolume(next);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  }, []);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        setLastVolume(volume > 0 ? volume : lastVolume);
        setVolume(0);
      } else if (lastVolume > 0 && volume === 0) {
        setVolume(lastVolume);
      }
      return next;
    });
  }, [lastVolume, volume]);

  const playFromQueue = useCallback(
    async (nextQueue: Track[], index: number, source: QueueSource = queueSource) => {
      const hasAds = nextQueue.some((track) => track.isAd);
      const resolved = hasAds
        ? { queue: nextQueue, mapIndex: (value: number) => value }
        : buildQueueWithAds(nextQueue);
      const queueIndex = resolved.mapIndex(index);
      const resolvedQueue = resolved.queue;
      const track = resolvedQueue[queueIndex];
      if (!track) {
        return;
      }
      setQueue(resolvedQueue);
      setQueueSource(source);
      setCurrentTrackIndex(queueIndex);
      setProgress(0);
      setCurrentTimeMs(0);
      setDurationMs(track.durationMs ?? null);
      setHasTrackSelected(true);
      await playTrack(track);
    },
    [playTrack, queueSource, buildQueueWithAds],
  );

  const playSharedTrack = useCallback(async () => {
    if (!shareTrackId) {
      return;
    }
    const index = tracks.findIndex((track) => track.id === shareTrackId);
    if (index < 0) {
      console.warn("Shared track not found:", shareTrackId);
      setShareTrackId(null);
      setShareGuestAllowed(false);
      setSharePromptOpen(false);
      clearShareParam();
      return;
    }
    await playFromQueue(tracks, index, "library");
    setShareTrackId(null);
    setShareGuestAllowed(false);
    setSharePromptOpen(false);
    clearShareParam();
  }, [shareTrackId, tracks, playFromQueue, clearShareParam]);

  useEffect(() => {
    if (!shareTrackId) {
      return;
    }
    if (isGuest && !shareGuestAllowed) {
      setSharePromptOpen(true);
      return;
    }
    if (isLoadingTracks || tracks.length === 0) {
      return;
    }
    void playSharedTrack();
  }, [shareTrackId, isGuest, shareGuestAllowed, isLoadingTracks, tracks.length, playSharedTrack]);

  const allowSharePlaybackAsGuest = useCallback(() => {
    setShareGuestAllowed(true);
    setSharePromptOpen(false);
  }, []);

  const dismissSharePrompt = useCallback(() => {
    setSharePromptOpen(false);
    setShareGuestAllowed(false);
    setShareTrackId(null);
    clearShareParam();
  }, [clearShareParam]);

  const handleTrackSelect = useCallback(
    async (index: number) => {
      const track = queue[index];
      if (!track) {
        return;
      }
      setCurrentTrackIndex(index);
      setProgress(0);
      setCurrentTimeMs(0);
      setDurationMs(track.durationMs ?? null);
      setHasTrackSelected(true);
      await playTrack(track);
    },
    [queue, playTrack],
  );

  const handlePlayToggle = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }

    if (!hasTrackSelected) {
      if (tracks[0]) {
        await playFromQueue(tracks, 0, "library");
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    await safePlay();
  }, [hasTrackSelected, isPlaying, playFromQueue, queue, queueSource, tracks, safePlay]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      event.preventDefault();
      handlePlayToggle();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayToggle]);

  const handleCardPlay = useCallback(
    async (index: number) => {
      await playFromQueue(tracks, index, "library");
    },
    [tracks, playFromQueue],
  );

  const handleQueuePlay = useCallback(
    async (nextQueue: Track[], index: number, source: QueueSource = "custom") => {
      await playFromQueue(nextQueue, index, source);
    },
    [playFromQueue],
  );

  const handleNext = useCallback(async () => {
    const activeQueue = queue.length ? queue : tracks;
    const source = queue.length ? queueSource : "library";
    if (!activeQueue.length) {
      return;
    }
    if (!hasTrackSelected) {
      await playFromQueue(activeQueue, 0, source);
      return;
    }
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < activeQueue.length) {
      await playFromQueue(activeQueue, nextIndex, source);
      return;
    }
    if (repeatMode === "all") {
      await playFromQueue(activeQueue, 0, source);
      return;
    }
    setIsPlaying(false);
  }, [
    queue,
    tracks,
    queueSource,
    hasTrackSelected,
    currentTrackIndex,
    repeatMode,
    playFromQueue,
  ]);

  const handlePrev = useCallback(async () => {
    const activeQueue = queue.length ? queue : tracks;
    const source = queue.length ? queueSource : "library";
    if (!activeQueue.length) {
      return;
    }
    if (!hasTrackSelected) {
      await playFromQueue(activeQueue, 0, source);
      return;
    }
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      await safePlay();
      return;
    }
    const prevIndex = currentTrackIndex - 1;
    if (prevIndex >= 0) {
      await playFromQueue(activeQueue, prevIndex, source);
      return;
    }
    if (repeatMode === "all") {
      await playFromQueue(activeQueue, activeQueue.length - 1, source);
      return;
    }
    setProgress(0);
    if (audio) {
      audio.currentTime = 0;
    }
  }, [
    queue,
    tracks,
    queueSource,
    hasTrackSelected,
    currentTrackIndex,
    repeatMode,
    playFromQueue,
    safePlay,
  ]);

  const handleRepeatToggle = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "off") {
        return "all";
      }
      if (prev === "all") {
        return "one";
      }
      return "off";
    });
  }, []);

  const handleEnded = useCallback(() => {
    if (!hasTrackSelected) {
      setIsPlaying(false);
      return;
    }
    if (repeatMode === "one") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
      }
      setProgress(0);
      void safePlay();
      return;
    }
    const activeQueue = queue.length ? queue : tracks;
    const source = queue.length ? queueSource : "library";
    if (!activeQueue.length) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < activeQueue.length) {
      void playFromQueue(activeQueue, nextIndex, source);
      return;
    }
    if (repeatMode === "all") {
      void playFromQueue(activeQueue, 0, source);
      return;
    }
    setIsPlaying(false);
  }, [
    hasTrackSelected,
    repeatMode,
    queue,
    tracks,
    queueSource,
    currentTrackIndex,
    playFromQueue,
    safePlay,
  ]);

  const toggleFavorite = useCallback(
    async (trackId: string) => {
      if (isGuest) {
        return;
      }
      const wasFavorite = favoriteIdsRef.current.has(trackId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.delete(trackId);
        } else {
          next.add(trackId);
        }
        favoriteIdsRef.current = next;
        return next;
      });
      try {
        await apiFetch(`/favorites/${trackId}`, {
          method: wasFavorite ? "DELETE" : "POST",
        });
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) {
            next.add(trackId);
          } else {
            next.delete(trackId);
          }
          favoriteIdsRef.current = next;
          return next;
        });
      }
    },
    [isGuest],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [handleEnded]);

  const activeQueue = queue.length ? queue : tracks;
  const currentTrackId = activeQueue[currentTrackIndex]?.id ?? null;

  return {
    isPlaying,
    progress,
    volume,
    isMuted,
    currentTrackIndex,
    currentTrackId,
    hasTrackSelected,
    tracks,
    isLoadingTracks,
    queue,
    repeatMode,
    isGuest,
    favoriteIds,
    favoritesReady,
    currentTimeMs,
    durationMs,
    shareTrackId,
    sharePromptOpen,
    allowSharePlaybackAsGuest,
    dismissSharePrompt,
    progressRef,
    volumeRef,
    handleProgressClick,
    handleVolumeClick,
    handleVolumeChange,
    handleMuteToggle,
    handleTrackSelect,
    handlePlayToggle,
    handleCardPlay,
    handleQueuePlay,
    handleNext,
    handlePrev,
    handleRepeatToggle,
    toggleFavorite,
    needsUserGesture,
  };
}
