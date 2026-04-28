import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WidgetPlayer, { type widget_player_state } from "./widget_player";

type websocket_state_message = {
  type?: string;
  payload?: Partial<widget_player_state>;
} & Partial<widget_player_state>;

const default_player_state: widget_player_state = {
  track_id: null,
  title: "Soundy",
  artist: "Waiting for player state",
  cover_url: null,
  duration_sec: 0,
  current_time_sec: 0,
  is_playing: false,
};

const websocket_url =
  (import.meta.env.VITE_WIDGET_WS_URL as string | undefined) ||
  "ws://127.0.0.1:32123";

function to_number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalize_state(input: Partial<widget_player_state>): widget_player_state {
  return {
    track_id:
      typeof input.track_id === "string" && input.track_id.trim()
        ? input.track_id
        : null,
    title: typeof input.title === "string" ? input.title : default_player_state.title,
    artist:
      typeof input.artist === "string" ? input.artist : default_player_state.artist,
    cover_url: typeof input.cover_url === "string" ? input.cover_url : null,
    duration_sec: Math.max(0, to_number(input.duration_sec)),
    current_time_sec: Math.max(0, to_number(input.current_time_sec)),
    is_playing: Boolean(input.is_playing),
  };
}

async function start_dragging_window() {
  const tauri_context = (window as Window & { __TAURI_INTERNALS__?: unknown })
    .__TAURI_INTERNALS__;
  if (!tauri_context) {
    return;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
}

export default function WidgetApp() {
  const [player_state, set_player_state] =
    useState<widget_player_state>(default_player_state);
  const [is_connected, set_is_connected] = useState(false);

  const websocket_ref = useRef<WebSocket | null>(null);
  const reconnect_timeout_ref = useRef<number | null>(null);
  const should_reconnect_ref = useRef(true);

  const clear_reconnect_timeout = useCallback(() => {
    if (reconnect_timeout_ref.current !== null) {
      window.clearTimeout(reconnect_timeout_ref.current);
      reconnect_timeout_ref.current = null;
    }
  }, []);

  const send_command = useCallback((command: string, payload?: Record<string, unknown>) => {
    const websocket = websocket_ref.current;
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      return;
    }
    websocket.send(
      JSON.stringify({
        type: "player_command",
        command,
        ...(payload ? { payload } : {}),
      }),
    );
  }, []);

  useEffect(() => {
    should_reconnect_ref.current = true;

    const connect = () => {
      clear_reconnect_timeout();
      const websocket = new WebSocket(websocket_url);
      websocket_ref.current = websocket;

      websocket.onopen = () => {
        set_is_connected(true);
        websocket.send(
          JSON.stringify({
            type: "widget_hello",
            client: "soundy_widget",
          }),
        );
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as websocket_state_message;
          const incoming_state =
            message.type === "player_state" ? message.payload || {} : message;
          set_player_state((prev_state) =>
            normalize_state({
              ...prev_state,
              ...incoming_state,
            }),
          );
        } catch {
          // ignore malformed websocket messages
        }
      };

      websocket.onerror = () => {
        set_is_connected(false);
      };

      websocket.onclose = () => {
        set_is_connected(false);
        websocket_ref.current = null;
        if (!should_reconnect_ref.current) {
          return;
        }
        reconnect_timeout_ref.current = window.setTimeout(() => {
          connect();
        }, 1200);
      };
    };

    connect();

    return () => {
      should_reconnect_ref.current = false;
      clear_reconnect_timeout();
      if (websocket_ref.current) {
        websocket_ref.current.close();
        websocket_ref.current = null;
      }
    };
  }, [clear_reconnect_timeout]);

  const handle_drag_area_mouse_down = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-no-drag='true']")) {
        return;
      }
      void start_dragging_window();
    },
    [],
  );

  const bounded_player_state = useMemo(() => {
    const safe_duration = Math.max(0, player_state.duration_sec);
    const safe_current_time = Math.min(
      Math.max(0, player_state.current_time_sec),
      safe_duration || player_state.current_time_sec,
    );

    return {
      ...player_state,
      duration_sec: safe_duration,
      current_time_sec: safe_current_time,
    };
  }, [player_state]);

  return (
    <WidgetPlayer
      player_state={bounded_player_state}
      is_connected={is_connected}
      on_prev={() => send_command("prev")}
      on_play_pause={() => send_command("play_pause")}
      on_next={() => send_command("next")}
      on_seek={(position_sec) => send_command("seek", { position_sec })}
      on_drag_area_mouse_down={handle_drag_area_mouse_down}
    />
  );
}
