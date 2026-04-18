"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header/Header";
import { apiFetch } from "@/lib/api";
import {
  build_theme_style,
  default_theme_config,
  normalize_theme_config,
  type theme_config,
} from "@/lib/theme";

type user_profile = {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_premium: boolean;
  country_code: string | null;
  theme_config?: unknown;
};

export default function UserProfilePage() {
  const params = useParams();
  const user_id = useMemo(() => {
    if (!params?.id) {
      return null;
    }
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);

  const [profile, set_profile] = useState<user_profile | null>(null);
  const [theme_config_state, set_theme_config_state] =
    useState<theme_config>(default_theme_config);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load_profile = async () => {
      try {
        if (!user_id) {
          set_error("Invalid user id");
          return;
        }

        set_loading(true);
        set_error(null);

        const res = await apiFetch(`/users/${user_id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load profile");
        }

        const data: user_profile = await res.json();
        if (mounted) {
          set_profile(data);
          set_theme_config_state(normalize_theme_config(data.theme_config));
        }
      } catch (err: unknown) {
        if (mounted) {
          set_error(err instanceof Error ? err.message : "Request failed");
        }
      } finally {
        if (mounted) {
          set_loading(false);
        }
      }
    };

    void load_profile();

    return () => {
      mounted = false;
    };
  }, [user_id]);

  const theme_style = useMemo(
    () => build_theme_style(theme_config_state),
    [theme_config_state],
  );

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="page-main" style={theme_style}>
          <section className="page-hero profile-hero themed-panel">
            <div className="page-hero-badge">Public Profile</div>
            <h1 className="page-hero-title">{profile?.username || "Profile"}</h1>
            <p className="page-hero-subtitle">User ID: {user_id ?? "—"}</p>
          </section>

          {loading && <div className="page-status">Loading...</div>}
          {error && <div className="page-status error">{error}</div>}

          {!loading && !error && profile && (
            <div className="profile-grid">
              <section className="profile-card themed-panel">
                <div className="profile-header">
                  <div className="profile-avatar" />
                  <div>
                    <div className="profile-name">{profile.username}</div>
                    <div className="profile-handle">@{profile.username}</div>
                  </div>
                </div>

                <div className="profile-details">
                  <div className="profile-detail">
                    <span>Email</span>
                    <span>{profile.email}</span>
                  </div>
                  <div className="profile-detail">
                    <span>Premium</span>
                    <span>{profile.is_premium ? "Yes" : "No"}</span>
                  </div>
                  <div className="profile-detail">
                    <span>Country</span>
                    <span>{profile.country_code || "—"}</span>
                  </div>
                  <div className="profile-detail">
                    <span>Theme preset</span>
                    <span>{theme_config_state.preset}</span>
                  </div>
                </div>
              </section>

              <section className="profile-card themed-panel">
                <div className="profile-section-title">Playlists</div>
                <div className="profile-playlists">
                  <div className="profile-playlist">Favorite tracks</div>
                  <div className="profile-playlist">Workout mix</div>
                  <div className="profile-playlist">Evening chill</div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
