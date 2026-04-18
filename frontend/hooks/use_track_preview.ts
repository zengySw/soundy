"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

type preview_manager_state = {
  active_track_id: string | null;
  is_loading: boolean;
  is_playing: boolean;
};

type start_preview_args = {
  track_id: string;
  preview_url: string;
  fade_in_ms: number;
  target_gain: number;
};

type use_track_preview_args = {
  track_id: string | null;
  enabled?: boolean;
  hover_delay_ms?: number;
  fade_in_ms?: number;
  fade_out_ms?: number;
  preview_start_sec?: number;
};

type use_track_preview_result = {
  on_mouse_enter: () => void;
  on_mouse_leave: () => void;
  is_preview_loading: boolean;
  is_preview_playing: boolean;
};

const default_preview_state: preview_manager_state = {
  active_track_id: null,
  is_loading: false,
  is_playing: false,
};

let preview_state: preview_manager_state = { ...default_preview_state };
let preview_audio: HTMLAudioElement | null = null;
let preview_audio_context: AudioContext | null = null;
let preview_source_node: MediaElementAudioSourceNode | null = null;
let preview_gain_node: GainNode | null = null;
let preview_version = 0;
let stop_timeout_id: number | null = null;
const preview_state_listeners = new Set<(state: preview_manager_state) => void>();

function emit_preview_state() {
  const snapshot = { ...preview_state };
  preview_state_listeners.forEach((listener) => listener(snapshot));
}

function set_preview_state(next_state: Partial<preview_manager_state>) {
  preview_state = {
    ...preview_state,
    ...next_state,
  };
  emit_preview_state();
}

function subscribe_preview_state(listener: (state: preview_manager_state) => void) {
  preview_state_listeners.add(listener);
  listener({ ...preview_state });
  return () => {
    preview_state_listeners.delete(listener);
  };
}

function clear_stop_timeout() {
  if (!stop_timeout_id) {
    return;
  }
  window.clearTimeout(stop_timeout_id);
  stop_timeout_id = null;
}

function get_audio_context_class() {
  if (typeof window === "undefined") {
    return null;
  }
  const context_class = window.AudioContext;
  if (context_class) {
    return context_class;
  }
  const legacy_window = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return legacy_window.webkitAudioContext ?? null;
}

function ensure_preview_nodes() {
  if (!preview_audio) {
    preview_audio = new Audio();
    preview_audio.preload = "auto";
    preview_audio.crossOrigin = "anonymous";
    preview_audio.addEventListener("ended", () => {
      set_preview_state({
        active_track_id: null,
        is_loading: false,
        is_playing: false,
      });
    });
  }

  if (!preview_audio_context) {
    const audio_context_class = get_audio_context_class();
    if (audio_context_class) {
      preview_audio_context = new audio_context_class();
    }
  }

  if (
    preview_audio &&
    preview_audio_context &&
    !preview_source_node &&
    !preview_gain_node
  ) {
    preview_source_node = preview_audio_context.createMediaElementSource(preview_audio);
    preview_gain_node = preview_audio_context.createGain();
    preview_gain_node.gain.value = 0;
    preview_source_node.connect(preview_gain_node);
    preview_gain_node.connect(preview_audio_context.destination);
  }

  return {
    preview_audio,
    preview_audio_context,
    preview_gain_node,
  };
}

function schedule_gain_change(target_gain: number, duration_ms: number) {
  if (preview_gain_node && preview_audio_context) {
    const now = preview_audio_context.currentTime;
    const safe_duration = Math.max(duration_ms, 0) / 1000;
    const gain_param = preview_gain_node.gain;
    gain_param.cancelScheduledValues(now);
    gain_param.setValueAtTime(gain_param.value, now);
    gain_param.linearRampToValueAtTime(target_gain, now + safe_duration);
    return;
  }

  if (preview_audio) {
    preview_audio.volume = target_gain;
  }
}

async function stop_preview_for_track(track_id: string | null, fade_out_ms: number) {
  if (!preview_audio) {
    return;
  }
  if (track_id && preview_state.active_track_id !== track_id) {
    return;
  }

  clear_stop_timeout();
  const local_preview_version = ++preview_version;

  set_preview_state({
    is_loading: false,
    is_playing: false,
  });
  schedule_gain_change(0, fade_out_ms);

  stop_timeout_id = window.setTimeout(() => {
    if (local_preview_version !== preview_version) {
      return;
    }
    if (!preview_audio) {
      return;
    }
    preview_audio.pause();
    preview_audio.removeAttribute("src");
    preview_audio.load();
    set_preview_state({
      active_track_id: null,
      is_loading: false,
      is_playing: false,
    });
  }, Math.max(fade_out_ms, 0) + 40);
}

async function start_preview({
  track_id,
  preview_url,
  fade_in_ms,
  target_gain,
}: start_preview_args) {
  const nodes = ensure_preview_nodes();
  if (!nodes.preview_audio) {
    return;
  }

  clear_stop_timeout();

  if (preview_state.active_track_id && preview_state.active_track_id !== track_id) {
    await stop_preview_for_track(preview_state.active_track_id, 120);
  }

  const local_preview_version = ++preview_version;

  set_preview_state({
    active_track_id: track_id,
    is_loading: true,
    is_playing: false,
  });

  try {
    if (nodes.preview_audio_context?.state === "suspended") {
      await nodes.preview_audio_context.resume();
    }

    nodes.preview_audio.pause();
    nodes.preview_audio.src = preview_url;
    nodes.preview_audio.currentTime = 0;
    nodes.preview_audio.load();

    if (nodes.preview_gain_node && nodes.preview_audio_context) {
      const now = nodes.preview_audio_context.currentTime;
      nodes.preview_gain_node.gain.cancelScheduledValues(now);
      nodes.preview_gain_node.gain.setValueAtTime(0, now);
    } else {
      nodes.preview_audio.volume = 0;
    }

    await nodes.preview_audio.play();

    if (local_preview_version !== preview_version) {
      return;
    }

    set_preview_state({
      active_track_id: track_id,
      is_loading: false,
      is_playing: true,
    });
    schedule_gain_change(target_gain, fade_in_ms);
  } catch {
    if (local_preview_version !== preview_version) {
      return;
    }
    nodes.preview_audio.pause();
    nodes.preview_audio.removeAttribute("src");
    nodes.preview_audio.load();
    set_preview_state({
      active_track_id: null,
      is_loading: false,
      is_playing: false,
    });
  }
}

function build_preview_url(track_id: string, preview_start_sec: number) {
  const safe_start_sec = Number.isFinite(preview_start_sec)
    ? Math.max(preview_start_sec, 0)
    : 0;
  const search_params = new URLSearchParams();
  search_params.set("start_sec", String(Math.round(safe_start_sec)));
  search_params.set("duration_sec", "30");
  return `${API_URL}/api/tracks/${encodeURIComponent(track_id)}/preview?${search_params.toString()}`;
}

export function use_track_preview({
  track_id,
  enabled = true,
  hover_delay_ms = 800,
  fade_in_ms = 300,
  fade_out_ms = 200,
  preview_start_sec = 30,
}: use_track_preview_args): use_track_preview_result {
  const [manager_state, set_manager_state] = useState<preview_manager_state>({
    ...default_preview_state,
  });
  const hover_timeout_ref = useRef<number | null>(null);

  const clear_hover_timeout = useCallback(() => {
    if (!hover_timeout_ref.current) {
      return;
    }
    window.clearTimeout(hover_timeout_ref.current);
    hover_timeout_ref.current = null;
  }, []);

  useEffect(() => subscribe_preview_state(set_manager_state), []);

  const on_mouse_enter = useCallback(() => {
    if (!enabled || !track_id) {
      return;
    }
    clear_hover_timeout();
    hover_timeout_ref.current = window.setTimeout(() => {
      const preview_url = build_preview_url(track_id, preview_start_sec);
      void start_preview({
        track_id,
        preview_url,
        fade_in_ms,
        target_gain: 0.3,
      });
    }, Math.max(hover_delay_ms, 0));
  }, [
    enabled,
    track_id,
    clear_hover_timeout,
    hover_delay_ms,
    preview_start_sec,
    fade_in_ms,
  ]);

  const on_mouse_leave = useCallback(() => {
    clear_hover_timeout();
    if (!track_id) {
      return;
    }
    void stop_preview_for_track(track_id, fade_out_ms);
  }, [clear_hover_timeout, track_id, fade_out_ms]);

  useEffect(
    () => () => {
      clear_hover_timeout();
      if (!track_id) {
        return;
      }
      void stop_preview_for_track(track_id, fade_out_ms);
    },
    [clear_hover_timeout, track_id, fade_out_ms],
  );

  const is_current_track = manager_state.active_track_id === track_id;

  return {
    on_mouse_enter,
    on_mouse_leave,
    is_preview_loading: is_current_track && manager_state.is_loading,
    is_preview_playing: is_current_track && manager_state.is_playing,
  };
}
