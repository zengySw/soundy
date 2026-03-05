import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import GlobalPlayer from "@/components/player/GlobalPlayer";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

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
      <body className={outfit.variable}>
        <PlayerProvider>
          {children}
          <GlobalPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
