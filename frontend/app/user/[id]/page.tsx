"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header/Header";
import { apiFetch } from "@/lib/api";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_premium: boolean;
  country_code: string | null;
};

export default function UserProfilePage() {
  const params = useParams();
  const userId = useMemo(() => {
    if (!params?.id) {
      return null;
    }
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        if (!userId) {
          setError("Некорректный user id");
          return;
        }
        setLoading(true);
        setError(null);
        const res = await apiFetch(`/users/${userId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Не удалось загрузить профиль");
        }
        const data: UserProfile = await res.json();
        if (mounted) {
          setProfile(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Ошибка запроса");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="page-main">
          <section className="page-hero profile-hero">
            <div className="page-hero-badge">Профиль</div>
            <h1 className="page-hero-title">{profile?.username || "Профиль"}</h1>
            <p className="page-hero-subtitle">
              User ID: {userId ?? "—"}
            </p>
          </section>

          {loading && <div className="page-status">Загрузка...</div>}
          {error && <div className="page-status error">{error}</div>}

          {!loading && !error && profile && (
            <div className="profile-grid">
              <section className="profile-card">
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
                    <span>{profile.is_premium ? "Да" : "Нет"}</span>
                  </div>
                  <div className="profile-detail">
                    <span>Страна</span>
                    <span>{profile.country_code || "—"}</span>
                  </div>
                </div>
              </section>

              <section className="profile-card">
                <div className="profile-section-title">Плейлисты</div>
                <div className="profile-playlists">
                  <div className="profile-playlist">Любимые треки</div>
                  <div className="profile-playlist">Для тренировок</div>
                  <div className="profile-playlist">Chill вечер</div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
