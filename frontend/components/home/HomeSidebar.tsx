"use client";

import type { DragEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Playlist = {
  id: string;
  name: string;
  track_count?: number | null;
};

export default function HomeSidebar() {
  const pathname = usePathname();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<{
    id: string;
    status: "success" | "exists" | "error";
  } | null>(null);
  const dropTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dropTimeoutRef.current !== null) {
        window.clearTimeout(dropTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPlaylists = async () => {
      try {
        const res = await apiFetch("/playlists");
        if (!res.ok) {
          if (res.status === 401) {
            setListError("Войдите, чтобы видеть плейлисты");
            return;
          }
          setListError("Не удалось загрузить плейлисты");
          return;
        }
        const data: Playlist[] = await res.json();
        if (mounted) {
          setPlaylists(Array.isArray(data) ? data : []);
          setListError(null);
        }
      } catch {
        if (mounted) {
          setListError("Не удалось загрузить плейлисты");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadPlaylists();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleAdded = (event: Event) => {
      const detail = (event as CustomEvent<{ playlistId?: string }>).detail;
      if (!detail?.playlistId) {
        return;
      }
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === detail.playlistId
            ? {
                ...playlist,
                track_count:
                  typeof playlist.track_count === "number"
                    ? playlist.track_count + 1
                    : playlist.track_count,
              }
            : playlist,
        ),
      );
    };
    const handleRemoved = (event: Event) => {
      const detail = (event as CustomEvent<{ playlistId?: string }>).detail;
      if (!detail?.playlistId) {
        return;
      }
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === detail.playlistId
            ? {
                ...playlist,
                track_count:
                  typeof playlist.track_count === "number"
                    ? Math.max(0, playlist.track_count - 1)
                    : playlist.track_count,
              }
            : playlist,
        ),
      );
    };
    window.addEventListener("soundy:playlist-track-added", handleAdded);
    window.addEventListener("soundy:playlist-track-removed", handleRemoved);
    return () => {
      window.removeEventListener("soundy:playlist-track-added", handleAdded);
      window.removeEventListener("soundy:playlist-track-removed", handleRemoved);
    };
  }, []);
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const canCreate = createName.trim().length > 0 && !creating;

  const handleOpenCreate = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    if (creating) {
      return;
    }
    setIsCreateOpen(false);
    setCreateError(null);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch("/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data: Playlist = await res.json();
        setPlaylists((prev) => [
          { id: data.id, name: data.name, track_count: data.track_count ?? 0 },
          ...prev,
        ]);
        setCreateName("");
        setCreateError(null);
        setIsCreateOpen(false);
        return;
      }
      const err = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setCreateError("Плейлист с таким названием уже есть");
      } else if (err?.message) {
        setCreateError(err.message);
      } else {
        setCreateError("Не удалось создать плейлист");
      }
    } catch {
      setCreateError("Не удалось создать плейлист");
    } finally {
      setCreating(false);
    }
  };

  const getDragTrackId = (dataTransfer: DataTransfer) => {
    const raw = dataTransfer.getData("application/x-soundy-track");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") {
          return parsed;
        }
        if (parsed && typeof parsed.id === "string") {
          return parsed.id;
        }
      } catch {
        return raw;
      }
    }
    const uri = dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain");
    if (!uri) {
      return null;
    }
    try {
      const url = new URL(uri);
      return url.searchParams.get("play");
    } catch {
      return null;
    }
  };

  const isTrackDrag = (dataTransfer: DataTransfer) => {
    const types = Array.from(dataTransfer.types);
    return (
      types.includes("application/x-soundy-track") || types.includes("text/uri-list")
    );
  };

  const scheduleDropReset = () => {
    if (dropTimeoutRef.current !== null) {
      window.clearTimeout(dropTimeoutRef.current);
    }
    dropTimeoutRef.current = window.setTimeout(() => {
      setDropState(null);
    }, 800);
  };

  const handleDrop = async (
    event: DragEvent<HTMLAnchorElement>,
    playlistId: string,
  ) => {
    event.preventDefault();
    const trackId = getDragTrackId(event.dataTransfer);
    if (!trackId) {
      return;
    }
    setDragOverId(null);
    try {
      const res = await apiFetch(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      if (!res.ok) {
        setDropState({ id: playlistId, status: "error" });
        scheduleDropReset();
        return;
      }
      const data = await res.json().catch(() => ({}));
      const added = Boolean(data?.added);
      if (added) {
        setPlaylists((prev) =>
          prev.map((playlist) =>
            playlist.id === playlistId
              ? {
                  ...playlist,
                  track_count:
                    typeof playlist.track_count === "number"
                      ? playlist.track_count + 1
                      : playlist.track_count,
                }
              : playlist,
          ),
        );
      }
      setDropState({ id: playlistId, status: added ? "success" : "exists" });
    } catch {
      setDropState({ id: playlistId, status: "error" });
    } finally {
      scheduleDropReset();
    }
  };

  const playlistItems = playlists.map((playlist) => {
    const active = isActive(`/playlists/${playlist.id}`);
    const isDropTarget = dragOverId === playlist.id;
    const dropStatus = dropState?.id === playlist.id ? dropState.status : null;
    const statusClass = dropStatus ? ` drop-${dropStatus}` : "";
    return (
      <Link
        key={playlist.id}
        href={`/playlists/${playlist.id}`}
        className={`playlist-item${active ? " active" : ""}${isDropTarget ? " drop-target" : ""}${statusClass}`}
        onDragOver={(event) => {
          if (!isTrackDrag(event.dataTransfer)) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          if (dragOverId !== playlist.id) {
            setDragOverId(playlist.id);
          }
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setDragOverId((prev) => (prev === playlist.id ? null : prev));
        }}
        onDrop={(event) => handleDrop(event, playlist.id)}
      >
        <span>{playlist.name}</span>
        {typeof playlist.track_count === "number" ? (
          <span className="playlist-count">{playlist.track_count}</span>
        ) : null}
      </Link>
    );
  });

  return (
    <aside className="sidebar">
      <div className="nav-section">
        <div className="nav-title">Меню</div>
        <Link href="/" className={`nav-item${isActive("/") ? " active" : ""}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>Главная</span>
        </Link>
        <div className={`nav-item${isActive("/search") ? " active" : ""}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>Поиск</span>
        </div>
        <Link
          href="/favorites"
          className={`nav-item${isActive("/favorites") ? " active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>Избранное</span>
        </Link>
        <Link
          href="/library"
          className={`nav-item${isActive("/library") ? " active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
          </svg>
          <span>Библиотека</span>
        </Link>
        <Link
          href="/artist/analytics"
          className={`nav-item${isActive("/artist/analytics") ? " active" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 19h16v2H2V3h2v16zm3-3H5v-6h2v6zm4 0H9V7h2v9zm4 0h-2V4h2v12zm4 0h-2v-8h2v8z" />
          </svg>
          <span>Analytics</span>
        </Link>
      </div>

      <div className="playlists">
        <div className="nav-title nav-title--row">
          <span>Плейлисты</span>
          <button
            type="button"
            className="playlist-create-button"
            onClick={handleOpenCreate}
            aria-label="Создать плейлист"
          >
            +
          </button>
        </div>

        {listError ? <div className="playlist-error">{listError}</div> : null}
        {loading ? (
          <div className="playlist-empty">Загружаю...</div>
        ) : playlists.length === 0 ? (
          <div className="playlist-empty">Пока нет плейлистов</div>
        ) : (
          playlistItems
        )}
      </div>

      {isCreateOpen ? (
        <div className="playlist-modal-overlay" onClick={handleCloseCreate}>
          <div
            className="playlist-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="playlist-modal-title">Новый плейлист</div>
            <input
              className="playlist-modal-input"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Название плейлиста"
              onKeyDown={(event) => {
                if (event.key === "Enter" && canCreate) {
                  handleCreate();
                }
              }}
              autoFocus
            />
            {createError ? (
              <div className="playlist-modal-error">{createError}</div>
            ) : null}
            <div className="playlist-modal-actions">
              <button
                type="button"
                className="playlist-modal-button ghost"
                onClick={handleCloseCreate}
              >
                Отмена
              </button>
              <button
                type="button"
                className="playlist-modal-button primary"
                disabled={!canCreate}
                onClick={handleCreate}
              >
                {creating ? "..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
