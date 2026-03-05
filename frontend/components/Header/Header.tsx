"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";


export default function Header() {
  const [isAuth, setIsAuth] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  
  const { goToLogin, goToRegister, goToSettings, goToUserProfile, logout } =
    useAuthActions();

  useEffect(() => {
    let mounted = true;
    const loadMe = async () => {
      try {
        const res = await apiFetch("/auth/me");
        if (!res.ok) {
          return;
        }
        const data: { userId?: string } = await res.json();
        if (mounted && data.userId) {
          setIsAuth(true);
          setUserId(data.userId);
        }
      } catch {
        // ignore
      }
    };

    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  useOutsideClick(profileRef, () => setProfileOpen(false));

  const handleLogout = () => {
    logout();
    setIsAuth(false);
    setUserId(null);
    setProfileOpen(false);
  };

  const handleProfile = () => {
    if (!userId) {
      return;
    }
    goToUserProfile(userId);
    setProfileOpen(false);
  };

  const handleSettings = () => {
    goToSettings();
    setProfileOpen(false);
  };

  return (
    <header className="header">
      <button className="logo" type="button" onClick={() => router.push("/")}>
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier">
              <path
                d="M3 11V13M6 14V16M6 8V10M9 10V14M12 7V17M15 12V20M15 4V8M18 9V15M21 11V13"
                stroke="#e9e9e9ff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
        <div className="logo-text">Soundy</div>
      </button>
      <div className="header-right">
        <div className="search-bar">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input type="text" placeholder="Поиск треков, исполнителей..." />
        </div>
        <div className="profile-wrapper" ref={profileRef}>
          <div className="user-profile" onClick={() => setProfileOpen((prev) => !prev)}>
            {isAuth ? "JD" : "?"}
          </div>

          {profileOpen && (
            <div className="profile-menu">
              {isAuth ? (
                <>
                  <button
                    className="profile-item"
                    onClick={handleProfile}
                    disabled={!userId}
                  >
                    Профиль
                  </button>
                  <button className="profile-item" onClick={handleSettings}>
                    Настройки
                  </button>
                  <div className="divider" />
                  <button className="profile-item danger" onClick={handleLogout}>
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="profile-item login"
                    onClick={() => {
                      goToLogin();
                      setProfileOpen(false);
                    }}
                  >
                    Войти
                  </button>
                  <button
                    className="profile-item reg"
                    onClick={() => {
                      goToRegister();
                      setProfileOpen(false);
                    }}
                  >
                    Регистрация
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
