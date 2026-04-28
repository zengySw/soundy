"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Header() {
  const [is_auth, set_is_auth] = useState(false);
  const [profile_open, set_profile_open] = useState(false);
  const [user_id, set_user_id] = useState<string | null>(null);
  const [search_input, set_search_input] = useState("");
  const profile_ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const { goToLogin, goToRegister, goToSettings, goToUserProfile, logout } =
    useAuthActions();

  useEffect(() => {
    let is_mounted = true;

    const load_me = async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (!response.ok) {
          return;
        }

        const payload: { user_id?: string; userId?: string } = await response.json();
        const resolved_user_id = payload.user_id ?? payload.userId;

        if (is_mounted && resolved_user_id) {
          set_is_auth(true);
          set_user_id(resolved_user_id);
        }
      } catch {
        // ignore
      }
    };

    void load_me();

    return () => {
      is_mounted = false;
    };
  }, []);

  useOutsideClick(profile_ref, () => set_profile_open(false));

  const handle_logout = () => {
    logout();
    set_is_auth(false);
    set_user_id(null);
    set_profile_open(false);
  };

  const handle_profile = () => {
    if (!user_id) {
      return;
    }
    goToUserProfile(user_id);
    set_profile_open(false);
  };

  const handle_settings = () => {
    goToSettings();
    set_profile_open(false);
  };

  const handle_search_submit = () => {
    const query_text = search_input.trim();
    if (!query_text) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query_text)}`);
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
          <input
            type="text"
            placeholder="Search tracks, artists, playlists"
            value={search_input}
            onChange={(event) => set_search_input(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }
              event.preventDefault();
              handle_search_submit();
            }}
          />
        </div>

        <div className="profile-wrapper" ref={profile_ref}>
          <div className="user-profile" onClick={() => set_profile_open((prev) => !prev)}>
            {is_auth ? "JD" : "?"}
          </div>

          {profile_open && (
            <div className="profile-menu">
              {is_auth ? (
                <>
                  <button
                    className="profile-item"
                    onClick={handle_profile}
                    disabled={!user_id}
                  >
                    Profile
                  </button>
                  <button className="profile-item" onClick={handle_settings}>
                    Settings
                  </button>
                  <div className="divider" />
                  <button className="profile-item danger" onClick={handle_logout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="profile-item login"
                    onClick={() => {
                      goToLogin();
                      set_profile_open(false);
                    }}
                  >
                    Login
                  </button>
                  <button
                    className="profile-item reg"
                    onClick={() => {
                      goToRegister();
                      set_profile_open(false);
                    }}
                  >
                    Register
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
