"use client";

import { createContext, useContext } from "react";
import { usePlayerControls } from "@/hooks/usePlayerControls";

type PlayerContextValue = ReturnType<typeof usePlayerControls>;

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const value = usePlayerControls();
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
