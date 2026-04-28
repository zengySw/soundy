import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import GlobalPlayer from "@/components/player/GlobalPlayer";

export const metadata: Metadata = {
  title: "Soundy",
  description: "Modern music player",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <PlayerProvider>
          {children}
          <GlobalPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
