"use client";

import { useState } from "react";
import Header from "@/components/Header/Header";
import LibraryTrackCard from "@/components/library/LibraryTrackCard";
import { tracks } from "@/data/library";

export default function LibraryPage() {
  const [, setCurrent] = useState<number | null>(null);

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="page-main">
          <section className="page-hero library-hero">
            <div className="page-hero-badge">Коллекция</div>
            <h1 className="page-hero-title">Библиотека</h1>
            <p className="page-hero-subtitle">
              Все сохраненные треки и подборки, которые ты слушаешь чаще всего.
            </p>
          </section>

          <section className="library-grid">
            {tracks.map((track) => (
              <LibraryTrackCard
                key={track.id}
                track={track}
                onSelect={setCurrent}
              />
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
