"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type waveform_player_props = {
  audio_url?: string | null;
  current_time?: number;
  audioUrl?: string | null;
  currentTime?: number;
  on_seek?: (target_time_seconds: number) => void;
  points_count?: number;
};

type canvas_size = {
  width: number;
  height: number;
};

const default_points_count = 200;
const default_canvas_height = 48;

function clamp(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function sample_amplitudes(channel_data: Float32Array, points_count: number) {
  if (points_count <= 0 || channel_data.length === 0) {
    return [];
  }

  const bucket_size = Math.max(1, Math.floor(channel_data.length / points_count));
  const sampled_points: number[] = [];

  for (let point_index = 0; point_index < points_count; point_index += 1) {
    const start_index = point_index * bucket_size;
    const end_index = Math.min(start_index + bucket_size, channel_data.length);
    if (start_index >= channel_data.length) {
      sampled_points.push(0);
      continue;
    }

    let max_amplitude = 0;
    for (let data_index = start_index; data_index < end_index; data_index += 1) {
      const amplitude = Math.abs(channel_data[data_index] ?? 0);
      if (amplitude > max_amplitude) {
        max_amplitude = amplitude;
      }
    }

    sampled_points.push(max_amplitude);
  }

  return sampled_points;
}

async function decode_waveform(audio_url: string, points_count: number) {
  const response = await fetch(audio_url);
  if (!response.ok) {
    throw new Error("WAVEFORM_FETCH_FAILED");
  }
  const array_buffer = await response.arrayBuffer();

  const audio_context_class = (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
  if (!audio_context_class) {
    throw new Error("AUDIO_CONTEXT_NOT_SUPPORTED");
  }

  const audio_context = new audio_context_class();
  try {
    const decoded_audio = await audio_context.decodeAudioData(array_buffer);
    const channel_data = decoded_audio.getChannelData(0);
    const points = sample_amplitudes(channel_data, points_count);
    return {
      points,
      duration_seconds: decoded_audio.duration || 0,
    };
  } finally {
    try {
      await audio_context.close();
    } catch {
      // ignore close error
    }
  }
}

function draw_waveform(
  canvas: HTMLCanvasElement,
  size: canvas_size,
  points: number[],
  played_ratio: number,
) {
  const context = canvas.getContext("2d");
  if (!context || size.width <= 0 || size.height <= 0) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const target_width = Math.max(1, Math.floor(size.width * dpr));
  const target_height = Math.max(1, Math.floor(size.height * dpr));

  if (canvas.width !== target_width || canvas.height !== target_height) {
    canvas.width = target_width;
    canvas.height = target_height;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(dpr, dpr);
  context.clearRect(0, 0, size.width, size.height);

  const center_y = size.height / 2;
  context.strokeStyle = "rgba(255, 255, 255, 0.10)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, center_y);
  context.lineTo(size.width, center_y);
  context.stroke();

  if (points.length === 0) {
    return;
  }

  const bar_step = size.width / points.length;
  const bar_width = Math.max(1, bar_step * 0.7);
  const played_x = size.width * clamp(played_ratio, 0, 1);

  for (let point_index = 0; point_index < points.length; point_index += 1) {
    const point_value = clamp(points[point_index] ?? 0, 0, 1);
    const scaled_amplitude = Math.max(1.5, point_value * size.height * 0.46);
    const x = point_index * bar_step + bar_step / 2;
    const is_played = x <= played_x;

    context.strokeStyle = is_played
      ? "rgba(34, 197, 94, 0.95)"
      : "rgba(96, 165, 250, 0.75)";
    context.lineCap = "round";
    context.lineWidth = bar_width;
    context.beginPath();
    context.moveTo(x, center_y - scaled_amplitude);
    context.lineTo(x, center_y + scaled_amplitude);
    context.stroke();
  }
}

export default function waveform_player({
  audio_url,
  current_time,
  audioUrl,
  currentTime,
  on_seek,
  points_count = default_points_count,
}: waveform_player_props) {
  const resolved_audio_url = audio_url ?? audioUrl ?? null;
  const resolved_current_time = current_time ?? currentTime ?? 0;
  const container_ref = useRef<HTMLDivElement | null>(null);
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const [wave_points, set_wave_points] = useState<number[]>([]);
  const [duration_seconds, set_duration_seconds] = useState(0);
  const [is_loading, set_is_loading] = useState(false);
  const [canvas_rect, set_canvas_rect] = useState<canvas_size>({
    width: 0,
    height: default_canvas_height,
  });

  useEffect(() => {
    if (!resolved_audio_url) {
      set_wave_points([]);
      set_duration_seconds(0);
      set_is_loading(false);
      return;
    }

    let is_cancelled = false;
    set_is_loading(true);

    decode_waveform(resolved_audio_url, points_count)
      .then((decoded) => {
        if (is_cancelled) {
          return;
        }
        set_wave_points(decoded.points);
        set_duration_seconds(decoded.duration_seconds);
      })
      .catch(() => {
        if (is_cancelled) {
          return;
        }
        set_wave_points([]);
        set_duration_seconds(0);
      })
      .finally(() => {
        if (!is_cancelled) {
          set_is_loading(false);
        }
      });

    return () => {
      is_cancelled = true;
    };
  }, [resolved_audio_url, points_count]);

  useEffect(() => {
    const container = container_ref.current;
    if (!container) {
      return;
    }

    const update_size = () => {
      const bounds = container.getBoundingClientRect();
      set_canvas_rect({
        width: bounds.width,
        height: bounds.height || default_canvas_height,
      });
    };

    update_size();

    const resize_observer = new ResizeObserver(() => {
      update_size();
    });
    resize_observer.observe(container);

    return () => {
      resize_observer.disconnect();
    };
  }, []);

  const played_ratio = useMemo(() => {
    if (duration_seconds <= 0) {
      return 0;
    }
    return clamp(resolved_current_time / duration_seconds, 0, 1);
  }, [resolved_current_time, duration_seconds]);

  useEffect(() => {
    const canvas = canvas_ref.current;
    if (!canvas) {
      return;
    }

    draw_waveform(canvas, canvas_rect, wave_points, played_ratio);
  }, [canvas_rect, wave_points, played_ratio]);

  const handle_seek = (client_x: number) => {
    if (!on_seek || duration_seconds <= 0 || !container_ref.current) {
      return;
    }
    const bounds = container_ref.current.getBoundingClientRect();
    const ratio = clamp((client_x - bounds.left) / bounds.width, 0, 1);
    on_seek(duration_seconds * ratio);
  };

  return (
    <div
      ref={container_ref}
      className={`waveform_player${is_loading ? " is_loading" : ""}`}
      onClick={(event) => handle_seek(event.clientX)}
      role="presentation"
    >
      <canvas ref={canvas_ref} className="waveform_canvas" />
    </div>
  );
}
