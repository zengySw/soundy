"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Playlist = {
  id: string;
  name: string;
};

type TrackContextMenuProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  track: { id: string; title: string; artist?: string | null } | null;
  isFavorite?: boolean;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  onClose: () => void;
  enableAddToPlaylist?: boolean;
};

export default function TrackContextMenu({
  open,
  position,
  track,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onRemove,
  removeLabel,
  onClose,
  enableAddToPlaylist = true,
}: TrackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setShowPlaylists(false);
      setActionMessage(null);
      return;
    }
    if (position) {
      setMenuPos(position);
    }
  }, [open, position]);

  useEffect(() => {
    if (!open || !position) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, position, onClose]);

  useEffect(() => {
    if (!open || !position) {
      return;
    }
    const updatePosition = () => {
      if (!menuRef.current || !position) {
        return;
      }
      const rect = menuRef.current.getBoundingClientRect();
      const padding = 12;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > window.innerWidth - padding) {
        x = window.innerWidth - rect.width - padding;
      }
      if (y + rect.height > window.innerHeight - padding) {
        y = window.innerHeight - rect.height - padding;
      }
      setMenuPos({ x: Math.max(padding, x), y: Math.max(padding, y) });
    };
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [open, position, showPlaylists, playlists.length, playlistsLoading, playlistsError]);

  useEffect(() => {
    if (!open || !showPlaylists || playlistsLoading) {
      return;
    }
    let mounted = true;
    const loadPlaylists = async () => {
      setPlaylistsLoading(true);
      try {
        const res = await apiFetch("/playlists");
        if (!res.ok) {
          if (mounted) {
            if (res.status === 401) {
              setPlaylistsError("Ð’Ð¾Ð¹Ð´Ð¸Ñ‚Ðµ, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð´Ð¾Ð±Ð°Ð²Ð»ÑÑ‚ÑŒ Ð² Ð¿Ð»ÐµÐ¹Ð»Ð¸ÑÑ‚Ñ‹");
            } else {
              setPlaylistsError("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ Ð¿Ð»ÐµÐ¹Ð»Ð¸ÑÑ‚Ñ‹");
            }
          }
          return;
        }
        const data: Playlist[] = await res.json();
        if (mounted) {
          setPlaylists(Array.isArray(data) ? data : []);
          setPlaylistsError(null);
        }
      } catch {
        if (mounted) {
          setPlaylistsError("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ Ð¿Ð»ÐµÐ¹Ð»Ð¸ÑÑ‚Ñ‹");
        }
      } finally {
        if (mounted) {
          setPlaylistsLoading(false);
        }
      }
    };
    loadPlaylists();
    return () => {
      mounted = false;
    };
  }, [open, showPlaylists, playlistsLoading]);

  const shareUrl = useMemo(() => {
    if (!track || typeof window === "undefined") {
      return null;
    }
    const url = new URL("/", window.location.origin);
    url.searchParams.set("play", track.id);
    return url.toString();
  }, [track]);

  const handleShare = async () => {
    if (!shareUrl) {
      return;
    }
    onClose();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setToastMessage("Ð¡ÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¾");
    } catch {
      setToastMessage("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ ÑÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ");
    } finally {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastMessage(null);
      }, 2000);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!track) {
      return;
    }
    try {
      const res = await apiFetch(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
      });
      if (!res.ok) {
        setActionMessage("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð´Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.added) {
        setActionMessage("Ð”Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¾ Ð² Ð¿Ð»ÐµÐ¹Ð»Ð¸ÑÑ‚");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("soundy:playlist-track-added", {
              detail: { playlistId },
            }),
          );
        }
        window.setTimeout(onClose, 400);
      } else {
        setActionMessage("Ð£Ð¶Ðµ Ð² Ð¿Ð»ÐµÐ¹Ð»Ð¸ÑÑ‚Ðµ");
        window.setTimeout(onClose, 400);
      }
    } catch {
      setActionMessage("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð´Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ");
    }
  };

  const toast =
    toastMessage && typeof document !== "undefined"
      ? createPortal(<div className="track-toast">{toastMessage}</div>, document.body)
      : null;

  if (!open || !track || !menuPos) {
    return toast;
  }

  const favoriteLabel = isFavorite ? "Ð£Ð±Ñ€Ð°Ñ‚ÑŒ Ð¸Ð· Ð¸Ð·Ð±Ñ€Ð°Ð½Ð½Ð¾Ð³Ð¾" : "Ð’ Ð¸Ð·Ð±Ñ€Ð°Ð½Ð½Ð¾Ðµ";

  const menu = (
    <div
      className="track-context-menu"
      ref={menuRef}
      style={{ left: menuPos.x, top: menuPos.y }}
      onContextMenu={(event: ReactMouseEvent) => event.preventDefault()}
    >
      <div className="track-context-header">
        <div className="track-context-title">{track.title}</div>
        {track.artist ? <div className="track-context-subtitle">{track.artist}</div> : null}
      </div>
      <button
        type="button"
        className="track-context-item"
        onClick={() => {
          onPlay?.();
          onClose();
        }}
      >
        Ð’Ð¾ÑÐ¿Ñ€Ð¾Ð¸Ð·Ð²ÐµÑÑ‚Ð¸
      </button>
      {onToggleFavorite ? (
        <button
          type="button"
          className="track-context-item"
          onClick={() => {
            onToggleFavorite();
            onClose();
          }}
        >
          {favoriteLabel}
        </button>
      ) : null}
      {enableAddToPlaylist ? (
        <button
          type="button"
          className="track-context-item"
          onClick={() => setShowPlaylists((prev) => !prev)}
        >
          Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ Ð² Ð¿Ð»ÐµÐ¹Ð»Ð¸ÑÑ‚
        </button>
      ) : null}
      {showPlaylists ? (
        <div className="track-context-submenu">
          {playlistsLoading ? (
            <div className="track-context-hint">Ð—Ð°Ð³Ñ€ÑƒÐ¶Ð°ÑŽ...</div>
          ) : playlistsError ? (
            <div className="track-context-hint error">{playlistsError}</div>
          ) : playlists.length === 0 ? (
            <div className="track-context-hint">ÐŸÐ»ÐµÐ¹Ð»Ð¸ÑÑ‚Ð¾Ð² Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚</div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                className="track-context-subitem"
                onClick={() => handleAddToPlaylist(playlist.id)}
              >
                {playlist.name}
              </button>
            ))
          )}
        </div>
      ) : null}
      <button type="button" className="track-context-item" onClick={handleShare}>
        ÐŸÐ¾Ð´ÐµÐ»Ð¸Ñ‚ÑŒÑÑ
      </button>
      {onRemove && removeLabel ? (
        <button
          type="button"
          className="track-context-item danger"
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          {removeLabel}
        </button>
      ) : null}
      {actionMessage ? <div className="track-context-hint">{actionMessage}</div> : null}
    </div>
  );

  return (
    <>
      {createPortal(menu, document.body)}
      {toast}
    </>
  );
}

