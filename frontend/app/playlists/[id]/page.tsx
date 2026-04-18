"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header/Header";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import { apiFetch, API_URL } from "@/lib/api";
import { useResizableSidebars } from "@/hooks/useResizableSidebars";
import TrackContextMenu from "@/components/tracks/TrackContextMenu";
import type {
  playlist_payload,
  playlist_socket_user,
  playlist_track,
} from "@/types/playlist";

type socket_track_added_payload = {
  playlist_id: string;
  track?: playlist_track;
};

type socket_track_removed_payload = {
  playlist_id: string;
  track_id?: string;
};

type socket_track_reordered_payload = {
  playlist_id: string;
  new_order?: string[];
};

type socket_online_payload = {
  playlist_id: string;
  users?: playlist_socket_user[];
};

type socket_collaborator_payload = {
  playlist_id: string;
  user?: playlist_socket_user;
};

function sort_tracks_by_position(track_items: playlist_track[]) {
  return [...track_items].sort((left_item, right_item) => {
    const left_position =
      typeof left_item.position === "number" && Number.isFinite(left_item.position)
        ? left_item.position
        : Number.MAX_SAFE_INTEGER;
    const right_position =
      typeof right_item.position === "number" && Number.isFinite(right_item.position)
        ? right_item.position
        : Number.MAX_SAFE_INTEGER;

    if (left_position !== right_position) {
      return left_position - right_position;
    }

    const left_added = left_item.added_at ? new Date(left_item.added_at).getTime() : 0;
    const right_added = right_item.added_at
      ? new Date(right_item.added_at).getTime()
      : 0;

    return right_added - left_added;
  });
}

function reorder_tracks(track_items: playlist_track[], new_order: string[]) {
  const track_by_id = new Map(track_items.map((track_item) => [track_item.id, track_item]));
  const ordered_items: playlist_track[] = [];

  new_order.forEach((track_id) => {
    const track_item = track_by_id.get(track_id);
    if (!track_item) {
      return;
    }
    ordered_items.push(track_item);
    track_by_id.delete(track_id);
  });

  const leftovers = Array.from(track_by_id.values());
  const merged = [...ordered_items, ...leftovers];

  return merged.map((track_item, index) => ({
    ...track_item,
    position: index + 1,
  }));
}

function move_track(track_items: playlist_track[], source_track_id: string, target_track_id: string) {
  const source_index = track_items.findIndex((item) => item.id === source_track_id);
  const target_index = track_items.findIndex((item) => item.id === target_track_id);

  if (source_index < 0 || target_index < 0 || source_index === target_index) {
    return track_items;
  }

  const next = [...track_items];
  const [removed] = next.splice(source_index, 1);
  next.splice(target_index, 0, removed);

  return next.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}

function dedupe_online_users(users: playlist_socket_user[]) {
  const users_by_id = new Map<string, playlist_socket_user>();

  users.forEach((user) => {
    const user_id = String(user.user_id ?? "").trim();
    if (!user_id) {
      return;
    }
    if (!users_by_id.has(user_id)) {
      users_by_id.set(user_id, user);
      return;
    }

    const existing = users_by_id.get(user_id)!;
    users_by_id.set(user_id, {
      ...existing,
      ...user,
      role: existing.role === "owner" ? "owner" : user.role,
    });
  });

  return Array.from(users_by_id.values());
}

function user_label(user: playlist_socket_user) {
  if (user.username && user.username.trim()) {
    return user.username.trim();
  }
  return "User";
}

function user_initials(user: playlist_socket_user) {
  const label = user_label(user);
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  const raw_id = params?.id;
  const playlist_id = Array.isArray(raw_id) ? raw_id[0] : raw_id;

  const {
    handleQueuePlay,
    handleTrackSelect,
    currentTrackIndex,
    hasTrackSelected,
    queue,
    tracks,
  } = usePlayer();

  const {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  } = useResizableSidebars();

  const socket_ref = useRef<Socket | null>(null);

  const [playlist, set_playlist] = useState<playlist_payload | null>(null);
  const [online_users, set_online_users] = useState<playlist_socket_user[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);
  const [action_error, set_action_error] = useState<string | null>(null);
  const [invite_message, set_invite_message] = useState<string | null>(null);
  const [inviting, set_inviting] = useState(false);
  const [dragging_track_id, set_dragging_track_id] = useState<string | null>(null);
  const [drag_over_track_id, set_drag_over_track_id] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    item: {
      id: string;
      title: string;
      artist: string;
    };
    position: { x: number; y: number };
  } | null>(null);

  const my_role = playlist?.my_role ?? "viewer";
  const can_edit_playlist = my_role === "owner" || my_role === "editor";

  useEffect(() => {
    let mounted = true;

    const load_playlist = async () => {
      if (!playlist_id) {
        return;
      }

      try {
        set_loading(true);
        const res = await apiFetch(`/playlists/${playlist_id}`);

        if (!res.ok) {
          if (res.status === 401) {
            set_error("Войдите, чтобы смотреть плейлисты");
            return;
          }
          if (res.status === 403) {
            set_error("Нет доступа к плейлисту");
            return;
          }
          set_error("Не удалось загрузить плейлист");
          return;
        }

        const data: playlist_payload = await res.json();
        if (mounted) {
          set_playlist({
            ...data,
            tracks: sort_tracks_by_position(data.tracks ?? []),
          });
          set_error(null);
        }
      } catch {
        if (mounted) {
          set_error("Не удалось загрузить плейлист");
        }
      } finally {
        if (mounted) {
          set_loading(false);
        }
      }
    };

    void load_playlist();

    return () => {
      mounted = false;
    };
  }, [playlist_id]);

  useEffect(() => {
    if (!playlist_id || loading || error) {
      return;
    }

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket_ref.current = socket;

    const join_room = () => {
      socket.emit(
        "joinRoom",
        { playlist_id },
        (response: { ok?: boolean; users?: playlist_socket_user[]; message?: string }) => {
          if (!response?.ok) {
            if (response?.message === "FORBIDDEN") {
              set_error("Нет доступа к realtime-плейлисту");
            }
            return;
          }
          set_online_users(dedupe_online_users(response.users ?? []));
        },
      );
    };

    const handle_online = (payload: socket_online_payload) => {
      if (payload.playlist_id !== playlist_id) {
        return;
      }
      set_online_users(dedupe_online_users(payload.users ?? []));
    };

    const handle_joined = (payload: socket_collaborator_payload) => {
      if (payload.playlist_id !== playlist_id || !payload.user) {
        return;
      }
      set_online_users((prev) => dedupe_online_users([...prev, payload.user!]));
    };

    const handle_left = (payload: socket_collaborator_payload) => {
      if (payload.playlist_id !== playlist_id || !payload.user) {
        return;
      }
      set_online_users((prev) =>
        prev.filter((user) => user.user_id !== payload.user?.user_id),
      );
    };

    const handle_track_added = (payload: socket_track_added_payload) => {
      if (payload.playlist_id !== playlist_id || !payload.track) {
        return;
      }

      set_playlist((prev) => {
        if (!prev) {
          return prev;
        }
        if (prev.tracks.some((track) => track.id === payload.track!.id)) {
          return prev;
        }
        return {
          ...prev,
          tracks: sort_tracks_by_position([...prev.tracks, payload.track!]),
        };
      });
    };

    const handle_track_removed = (payload: socket_track_removed_payload) => {
      if (payload.playlist_id !== playlist_id || !payload.track_id) {
        return;
      }
      set_playlist((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          tracks: prev.tracks.filter((track) => track.id !== payload.track_id),
        };
      });
    };

    const handle_track_reordered = (payload: socket_track_reordered_payload) => {
      if (payload.playlist_id !== playlist_id || !Array.isArray(payload.new_order)) {
        return;
      }
      set_playlist((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          tracks: reorder_tracks(prev.tracks, payload.new_order ?? []),
        };
      });
    };

    socket.on("connect", join_room);
    socket.on("online_collaborators", handle_online);
    socket.on("collaborator_joined", handle_joined);
    socket.on("collaborator_left", handle_left);
    socket.on("track_added", handle_track_added);
    socket.on("track_removed", handle_track_removed);
    socket.on("track_reordered", handle_track_reordered);

    return () => {
      socket.emit("leaveRoom", { playlist_id });
      socket.off("connect", join_room);
      socket.off("online_collaborators", handle_online);
      socket.off("collaborator_joined", handle_joined);
      socket.off("collaborator_left", handle_left);
      socket.off("track_added", handle_track_added);
      socket.off("track_removed", handle_track_removed);
      socket.off("track_reordered", handle_track_reordered);
      socket.disconnect();
      socket_ref.current = null;
      set_online_users([]);
    };
  }, [playlist_id, loading, error]);

  const playlist_queue = useMemo(() => {
    if (!playlist) {
      return [];
    }

    const track_map = new Map<string, (typeof tracks)[number]>();
    tracks.forEach((track) => track_map.set(track.id, track));

    return playlist.tracks.map((track_item) => {
      const track = track_map.get(track_item.id);
      if (track) {
        return track;
      }
      return {
        id: track_item.id,
        title: track_item.title,
        artist: "Unknown artist",
        album: null,
        year: null,
        genre: null,
        durationMs: track_item.duration_ms ?? null,
        cover: null,
      };
    });
  }, [playlist, tracks]);

  const playlist_items = useMemo(
    () =>
      (playlist?.tracks ?? []).map((track_item, index) => {
        const loaded_track = tracks.find((track) => track.id === track_item.id);
        const duration_ms = loaded_track?.durationMs ?? track_item.duration_ms ?? null;

        return {
          id: track_item.id,
          title: loaded_track?.title ?? track_item.title,
          artist: loaded_track?.artist ?? "Unknown artist",
          cover: loaded_track?.cover ?? null,
          duration_ms,
          added_at: track_item.added_at ?? null,
          order: index + 1,
        };
      }),
    [playlist, tracks],
  );

  const queue_items = useMemo(() => {
    const active_queue = queue.length ? queue : tracks;
    return active_queue.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: formatDuration(track.durationMs),
      cover: track.cover ?? null,
    }));
  }, [queue, tracks]);

  const current_track = useMemo(() => {
    if (!hasTrackSelected) {
      return null;
    }
    return queue_items[currentTrackIndex] ?? queue_items[0] ?? null;
  }, [hasTrackSelected, currentTrackIndex, queue_items]);

  const grid_style = useMemo(
    () =>
      ({
        "--sidebar-left": `${leftWidth}px`,
        "--sidebar-right": `${rightWidth}px`,
      }) as CSSProperties,
    [leftWidth, rightWidth],
  );

  const handle_row_play = (track_id: string) => {
    const index = playlist_queue.findIndex((track_item) => track_item.id === track_id);
    if (index < 0) {
      return;
    }
    handleQueuePlay(playlist_queue, index, "custom");
  };

  const handle_remove_from_playlist = async () => {
    if (!playlist_id || !contextMenu || !playlist || !can_edit_playlist) {
      return;
    }

    const removed_track_id = contextMenu.item.id;
    const previous_tracks = playlist.tracks;

    set_action_error(null);
    set_playlist({
      ...playlist,
      tracks: playlist.tracks.filter((track) => track.id !== removed_track_id),
    });

    try {
      const res = await apiFetch(`/playlists/${playlist_id}/tracks/${removed_track_id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Не удалось удалить трек");
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("soundy:playlist-track-removed", {
            detail: { playlistId: playlist_id },
          }),
        );
      }
    } catch {
      set_playlist((prev) => {
        if (!prev || prev.id !== playlist.id) {
          return prev;
        }
        return {
          ...prev,
          tracks: previous_tracks,
        };
      });
      set_action_error("Rollback: удаление не удалось");
    }
  };

  const handle_drop_reorder = async (target_track_id: string) => {
    if (!playlist_id || !playlist || !dragging_track_id || !can_edit_playlist) {
      return;
    }

    set_drag_over_track_id(null);
    set_dragging_track_id(null);

    if (dragging_track_id === target_track_id) {
      return;
    }

    const previous_tracks = playlist.tracks;
    const next_tracks = move_track(previous_tracks, dragging_track_id, target_track_id);

    if (next_tracks === previous_tracks) {
      return;
    }

    set_action_error(null);
    set_playlist({
      ...playlist,
      tracks: next_tracks,
    });

    const new_order = next_tracks.map((track) => track.id);

    try {
      const res = await apiFetch(`/playlists/${playlist_id}/tracks/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_order }),
      });

      if (!res.ok) {
        throw new Error("Не удалось изменить порядок");
      }
    } catch {
      set_playlist((prev) => {
        if (!prev || prev.id !== playlist.id) {
          return prev;
        }
        return {
          ...prev,
          tracks: previous_tracks,
        };
      });
      set_action_error("Rollback: порядок не сохранён");
    }
  };

  const handle_invite = async () => {
    if (!playlist_id || !can_edit_playlist) {
      return;
    }

    set_inviting(true);
    set_invite_message(null);

    try {
      const response = await apiFetch(`/api/playlists/${playlist_id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "editor", expires_days: 7 }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "Не удалось создать ссылку",
        );
      }

      const payload = await response.json();
      const invite_url =
        typeof payload?.invite_url === "string" && payload.invite_url
          ? payload.invite_url
          : null;

      if (invite_url && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(invite_url);
        set_invite_message("Invite link copied");
      } else {
        set_invite_message(invite_url ? invite_url : "Invite token created");
      }
    } catch (err: unknown) {
      set_invite_message(err instanceof Error ? err.message : "Invite failed");
    } finally {
      set_inviting(false);
    }
  };

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <div className="main-grid" ref={gridRef} style={grid_style}>
          <HomeSidebar />
          <div
            className="resize-handle resize-handle--left"
            onPointerDown={onLeftResizeStart}
            aria-hidden="true"
          />

          <main className="favorites-main">
            <section className="favorites-hero">
              <div className="favorites-hero-badge">Playlist</div>
              <div className="playlist-hero-top-row">
                <h1 className="favorites-hero-title">{playlist?.name ?? "Playlist"}</h1>

                <div className="playlist-online-block">
                  <div className="playlist-online-avatars">
                    {online_users.slice(0, 8).map((user) => (
                      <div
                        key={user.user_id}
                        className="playlist-online-avatar"
                        title={`${user_label(user)} (${user.role})`}
                        style={
                          user.avatar_url
                            ? {
                                backgroundImage: `url(${user.avatar_url})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        {!user.avatar_url ? user_initials(user) : null}
                      </div>
                    ))}
                  </div>
                  <div className="playlist-online-count">Online: {online_users.length}</div>
                </div>
              </div>

              {playlist?.description ? (
                <p className="favorites-hero-subtitle">{playlist.description}</p>
              ) : (
                <p className="favorites-hero-subtitle">Shared playlist with realtime updates.</p>
              )}

              <div className="favorites-hero-meta playlist-hero-meta-row">
                <span>{playlist_items.length} tracks</span>
                <span className="playlist-role-chip">Role: {my_role}</span>
                {can_edit_playlist ? (
                  <button
                    type="button"
                    className="playlist-invite-button"
                    onClick={handle_invite}
                    disabled={inviting}
                  >
                    {inviting ? "Creating..." : "Invite"}
                  </button>
                ) : null}
              </div>

              {invite_message ? <div className="playlist-action-message">{invite_message}</div> : null}
              {action_error ? <div className="playlist-action-error">{action_error}</div> : null}
            </section>

            {loading ? (
              <div className="favorites-empty">Loading...</div>
            ) : error ? (
              <div className="favorites-empty">{error}</div>
            ) : playlist_items.length === 0 ? (
              <div className="favorites-empty">Playlist is empty</div>
            ) : (
              <section className="favorites-list">
                <div className="favorites-row favorites-row--header">
                  <div className="favorites-cell favorites-index">#</div>
                  <div className="favorites-cell favorites-title">Track</div>
                  <div className="favorites-cell favorites-added">Added</div>
                  <div className="favorites-cell favorites-duration">Time</div>
                </div>

                {playlist_items.map((item) => {
                  const is_dragging = dragging_track_id === item.id;
                  const is_drag_over = drag_over_track_id === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`favorites-row${is_dragging ? " is-dragging" : ""}${
                        is_drag_over ? " is-drag-over" : ""
                      }`}
                      draggable={can_edit_playlist}
                      onDragStart={(event: DragEvent<HTMLDivElement>) => {
                        if (!can_edit_playlist) {
                          return;
                        }
                        set_dragging_track_id(item.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(event) => {
                        if (!can_edit_playlist || !dragging_track_id) {
                          return;
                        }
                        event.preventDefault();
                        set_drag_over_track_id(item.id);
                      }}
                      onDragLeave={(event) => {
                        if (event.currentTarget.contains(event.relatedTarget as Node)) {
                          return;
                        }
                        set_drag_over_track_id((prev) => (prev === item.id ? null : prev));
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        void handle_drop_reorder(item.id);
                      }}
                      onDragEnd={() => {
                        set_dragging_track_id(null);
                        set_drag_over_track_id(null);
                      }}
                      onClick={() => handle_row_play(item.id)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setContextMenu({
                          item: {
                            id: item.id,
                            title: item.title,
                            artist: item.artist,
                          },
                          position: { x: event.clientX, y: event.clientY },
                        });
                      }}
                    >
                      <div className="favorites-cell favorites-index">{item.order}</div>
                      <div className="favorites-cell favorites-title">
                        <div
                          className="favorites-cover"
                          style={{
                            background: item.cover
                              ? `url(${item.cover})`
                              : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="favorites-meta">
                          <div className="favorites-track">{item.title}</div>
                          <div className="favorites-artist">{item.artist}</div>
                        </div>
                      </div>
                      <div className="favorites-cell favorites-added">
                        {item.added_at
                          ? new Date(item.added_at).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                      <div className="favorites-cell favorites-duration">
                        {item.duration_ms ? formatDuration(item.duration_ms) : "—"}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </main>

          <div
            className="resize-handle resize-handle--right"
            onPointerDown={onRightResizeStart}
            aria-hidden="true"
          />

          {current_track ? (
            <NowPlayingPanel
              currentTrack={current_track}
              queue={queue_items}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={handleTrackSelect}
            />
          ) : null}
        </div>
      </div>

      <TrackContextMenu
        open={Boolean(contextMenu)}
        position={contextMenu?.position ?? null}
        track={contextMenu?.item ?? null}
        onPlay={
          contextMenu
            ? () => {
                handle_row_play(contextMenu.item.id);
              }
            : undefined
        }
        removeLabel={can_edit_playlist ? "Remove from playlist" : undefined}
        onRemove={can_edit_playlist ? handle_remove_from_playlist : undefined}
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}
