"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { getPercentFromPointer } from "@/utils/slider";
import type { Track } from "@/types/track";
import { apiFetch } from "@/lib/api";

export function usePlayerControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(65);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [hasTrackSelected, setHasTrackSelected] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(65);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const safePlay = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      console.error("Audio play error:", err);
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
    audioRef.current.volume = volume / 100;

    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      if (!audio.duration) {
        return;
      }
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
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
  }, []);

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
    let mounted = true;

    const loadTracks = async () => {
      try {
        const res = await apiFetch("/tracks");
        if (!res.ok) {
          throw new Error("Не удалось загрузить треки");
        }
        const data: Track[] = await res.json();
        if (mounted) {
          setTracks(data);
        }
      } catch {
        if (mounted) {
          setTracks([]);
        }
      }
    };

    loadTracks();

    return () => {
      mounted = false;
    };
  }, []);

  const playTrack = useCallback(async (track: Track) => {
    if (!audioRef.current) {
      return;
    }

    try {
      const res = await apiFetch(`/tracks/${track.id}/stream`);
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

  const handleTrackSelect = useCallback(
    async (index: number) => {
      const track = tracks[index];
      if (!track) {
        return;
      }
      setCurrentTrackIndex(index);
      setProgress(0);
      setHasTrackSelected(true);
      await playTrack(track);
    },
    [tracks, playTrack],
  );

  const handlePlayToggle = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }

    if (!hasTrackSelected) {
      const firstTrack = tracks[0];
      if (firstTrack) {
        setCurrentTrackIndex(0);
        setHasTrackSelected(true);
        await playTrack(firstTrack);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    await safePlay();
  }, [hasTrackSelected, isPlaying, playTrack, tracks, safePlay]);

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
      const track = tracks[index];
      if (!track) {
        return;
      }
      setCurrentTrackIndex(index);
      setHasTrackSelected(true);
      await playTrack(track);
    },
    [tracks, playTrack],
  );

  return {
    isPlaying,
    progress,
    volume,
    isMuted,
    currentTrackIndex,
    hasTrackSelected,
    tracks,
    progressRef,
    volumeRef,
    handleProgressClick,
    handleVolumeClick,
    handleVolumeChange,
    handleMuteToggle,
    handleTrackSelect,
    handlePlayToggle,
    handleCardPlay,
  };
}
