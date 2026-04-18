"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header/Header";
import { apiFetch } from "@/lib/api";
import {
  build_theme_style,
  default_theme_config,
  get_preset_theme_config,
  normalize_theme_config,
  theme_presets,
  type theme_config,
  type theme_preset,
} from "@/lib/theme";

type me_response = {
  user_id?: string;
  userId?: string;
};

type user_profile = {
  id: string;
  username: string;
  email: string;
  theme_config?: unknown;
};

const preset_order: Array<Exclude<theme_preset, "custom">> = [
  "dark",
  "ocean",
  "forest",
  "sunset",
  "cyberpunk",
  "rose",
  "monochrome",
  "neon",
];

const preset_labels: Record<Exclude<theme_preset, "custom">, string> = {
  dark: "Dark",
  ocean: "Ocean",
  forest: "Forest",
  sunset: "Sunset",
  cyberpunk: "Cyberpunk",
  rose: "Rose",
  monochrome: "Monochrome",
  neon: "Neon",
};

function resolve_user_id(payload: me_response): string | null {
  const user_id = payload.user_id ?? payload.userId;
  if (!user_id || typeof user_id !== "string") {
    return null;
  }
  return user_id;
}

export default function SettingsPage() {
  const [current_user, set_current_user] = useState<user_profile | null>(null);
  const [theme_config_state, set_theme_config_state] =
    useState<theme_config>(default_theme_config);
  const [is_loading, set_is_loading] = useState(true);
  const [is_saving, set_is_saving] = useState(false);
  const [page_error, set_page_error] = useState<string | null>(null);
  const [save_message, set_save_message] = useState<string | null>(null);

  useEffect(() => {
    let is_mounted = true;

    const load_profile = async () => {
      try {
        set_is_loading(true);
        set_page_error(null);

        const me_res = await apiFetch("/auth/me");
        if (!me_res.ok) {
          throw new Error("Sign in to manage profile theme");
        }

        const me_payload = (await me_res.json()) as me_response;
        const user_id = resolve_user_id(me_payload);
        if (!user_id) {
          throw new Error("User session is missing");
        }

        const profile_res = await apiFetch(`/users/${user_id}`);
        if (!profile_res.ok) {
          const error_payload = await profile_res.json().catch(() => ({}));
          throw new Error(
            typeof error_payload?.message === "string"
              ? error_payload.message
              : "Failed to load profile",
          );
        }

        const profile_payload = (await profile_res.json()) as user_profile;

        if (!is_mounted) {
          return;
        }

        set_current_user(profile_payload);
        set_theme_config_state(normalize_theme_config(profile_payload.theme_config));
      } catch (err: unknown) {
        if (!is_mounted) {
          return;
        }
        set_page_error(
          err instanceof Error ? err.message : "Failed to load settings",
        );
      } finally {
        if (is_mounted) {
          set_is_loading(false);
        }
      }
    };

    void load_profile();

    return () => {
      is_mounted = false;
    };
  }, []);

  const theme_style = useMemo(
    () => build_theme_style(theme_config_state),
    [theme_config_state],
  );

  const handle_select_preset = (preset_key: Exclude<theme_preset, "custom">) => {
    set_save_message(null);
    set_theme_config_state(get_preset_theme_config(preset_key));
  };

  const handle_color_change = (key: "primary" | "accent" | "bg", value: string) => {
    set_save_message(null);
    set_theme_config_state((prev_state) => ({
      ...prev_state,
      [key]: value,
      preset: "custom",
    }));
  };

  const handle_save_theme = async () => {
    try {
      set_is_saving(true);
      set_page_error(null);
      set_save_message(null);

      const response = await apiFetch("/api/users/me/theme", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(theme_config_state),
      });

      if (!response.ok) {
        const error_payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof error_payload?.message === "string"
            ? error_payload.message
            : "Failed to save theme",
        );
      }

      const payload = await response.json();
      const saved_theme_config = normalize_theme_config(payload?.theme_config);
      set_theme_config_state(saved_theme_config);
      set_save_message("Theme saved");
    } catch (err: unknown) {
      set_page_error(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      set_is_saving(false);
    }
  };

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="page-main settings-main" style={theme_style}>
          <section className="page-hero settings-hero themed-panel">
            <div className="page-hero-badge">Profile Theme</div>
            <h1 className="page-hero-title">Custom Color Theme</h1>
            <p className="page-hero-subtitle">
              Configure your public profile colors and let other users see your style.
            </p>
          </section>

          {is_loading && <div className="page-status">Loading settings...</div>}
          {page_error && <div className="page-status error">{page_error}</div>}

          {!is_loading && !page_error && (
            <section className="theme-settings-grid">
              <div className="theme-card themed-panel">
                <h2 className="settings-card-title">Preset Themes</h2>
                <div className="theme-presets-grid">
                  {preset_order.map((preset_key) => {
                    const preset = theme_presets[preset_key];
                    const is_active = theme_config_state.preset === preset_key;
                    return (
                      <button
                        key={preset_key}
                        type="button"
                        className={`theme-preset-button${is_active ? " active" : ""}`}
                        onClick={() => handle_select_preset(preset_key)}
                      >
                        <span>{preset_labels[preset_key]}</span>
                        <span
                          className="theme-preset-swatch"
                          style={{
                            background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})`,
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="theme-card themed-panel">
                <h2 className="settings-card-title">Custom Colors</h2>
                <div className="theme-color-grid">
                  <label className="theme-color-control">
                    <span>Primary</span>
                    <input
                      type="color"
                      value={theme_config_state.primary}
                      onChange={(event) =>
                        handle_color_change("primary", event.target.value)
                      }
                    />
                  </label>

                  <label className="theme-color-control">
                    <span>Accent</span>
                    <input
                      type="color"
                      value={theme_config_state.accent}
                      onChange={(event) => handle_color_change("accent", event.target.value)}
                    />
                  </label>

                  <label className="theme-color-control">
                    <span>Background</span>
                    <input
                      type="color"
                      value={theme_config_state.bg}
                      onChange={(event) => handle_color_change("bg", event.target.value)}
                    />
                  </label>
                </div>

                <button
                  className="settings-action theme-save-button"
                  type="button"
                  onClick={handle_save_theme}
                  disabled={is_saving}
                >
                  {is_saving ? "Saving..." : "Save Theme"}
                </button>

                {save_message && <div className="theme-save-message">{save_message}</div>}
              </div>

              <div className="theme-card themed-panel theme-preview-card">
                <h2 className="settings-card-title">Live Profile Preview</h2>
                <div className="theme-profile-preview themed-panel" style={theme_style}>
                  <div className="theme-preview-header">
                    <div className="theme-preview-avatar" />
                    <div>
                      <div className="profile-name">{current_user?.username ?? "User"}</div>
                      <div className="profile-handle">
                        @{current_user?.username?.toLowerCase() ?? "profile"}
                      </div>
                    </div>
                  </div>
                  <div className="theme-preview-meta">
                    <span>{current_user?.email ?? "user@soundy.app"}</span>
                    <span>Preset: {theme_config_state.preset}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
