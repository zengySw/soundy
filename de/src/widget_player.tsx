import { useMemo, useState } from "react";

export type widget_player_state = {
  track_id: string | null;
  title: string;
  artist: string;
  cover_url: string | null;
  duration_sec: number;
  current_time_sec: number;
  is_playing: boolean;
};

type widget_player_props = {
  player_state: widget_player_state;
  is_connected: boolean;
  on_prev: () => void;
  on_play_pause: () => void;
  on_next: () => void;
  on_seek: (position_sec: number) => void;
  on_drag_area_mouse_down: (event: React.MouseEvent<HTMLDivElement>) => void;
};

function format_time(total_seconds: number) {
  const safe_seconds = Math.max(0, Math.floor(total_seconds));
  const minutes = Math.floor(safe_seconds / 60);
  const seconds = safe_seconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function WidgetPlayer({
  player_state,
  is_connected,
  on_prev,
  on_play_pause,
  on_next,
  on_seek,
  on_drag_area_mouse_down,
}: widget_player_props) {
  const [seeking_value, set_seeking_value] = useState<number | null>(null);

  const duration_sec = Math.max(0, Number(player_state.duration_sec || 0));
  const current_time_sec = Math.max(0, Number(player_state.current_time_sec || 0));

  const slider_value = useMemo(() => {
    if (seeking_value !== null) {
      return seeking_value;
    }
    return Math.min(current_time_sec, duration_sec || 0);
  }, [seeking_value, current_time_sec, duration_sec]);

  const cover_style: React.CSSProperties = player_state.cover_url
    ? {
        backgroundImage: `url(${player_state.cover_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div className="widget_root" onMouseDown={on_drag_area_mouse_down}>
      <div className="widget_cover" style={cover_style} />

      <div className="widget_main">
        <div className="widget_meta">
          <div className="widget_title">{player_state.title || "Nothing playing"}</div>
          <div className="widget_artist">{player_state.artist || "Soundy"}</div>
        </div>

        <div className="widget_controls">
          <button type="button" className="widget_button" onClick={on_prev} data-no-drag="true">
            <span>⏮</span>
          </button>
          <button
            type="button"
            className="widget_button widget_button_primary"
            onClick={on_play_pause}
            data-no-drag="true"
          >
            <span>{player_state.is_playing ? "⏸" : "▶"}</span>
          </button>
          <button type="button" className="widget_button" onClick={on_next} data-no-drag="true">
            <span>⏭</span>
          </button>
        </div>

        <div className="widget_seek_row">
          <span className="widget_time">{format_time(slider_value)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(duration_sec, 1)}
            step={0.1}
            value={slider_value}
            data-no-drag="true"
            onChange={(event) => {
              set_seeking_value(Number(event.target.value));
            }}
            onMouseUp={(event) => {
              const next_value = Number((event.target as HTMLInputElement).value);
              set_seeking_value(null);
              on_seek(next_value);
            }}
            onTouchEnd={(event) => {
              const next_value = Number((event.target as HTMLInputElement).value);
              set_seeking_value(null);
              on_seek(next_value);
            }}
            className="widget_seek"
          />
          <span className="widget_time">{format_time(duration_sec)}</span>
        </div>
      </div>

      <div
        className={`widget_status_dot ${is_connected ? "is_connected" : "is_disconnected"}`}
        title={is_connected ? "connected" : "disconnected"}
      />
    </div>
  );
}
