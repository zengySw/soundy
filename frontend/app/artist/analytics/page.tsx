"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Header from "@/components/Header/Header";
import HomeSidebar from "@/components/home/HomeSidebar";
import NowPlayingPanel from "@/components/home/NowPlayingPanel";
import { usePlayer } from "@/context/PlayerContext";
import { formatDuration } from "@/utils/format";
import { apiFetch } from "@/lib/api";
import { useResizableSidebars } from "@/hooks/useResizableSidebars";
import type {
  analytics_period,
  artist_plays_item,
  artist_top_track_item,
  artist_source_item,
  artist_geography_item,
  artist_plays_response,
  artist_analytics_response,
} from "@/types/artist_analytics";

const period_options: Array<{ key: analytics_period; label: string }> = [
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "90d", label: "90 дней" },
];

const source_colors: Record<string, string> = {
  search: "#60a5fa",
  playlist: "#34d399",
  recommendations: "#f59e0b",
  unknown: "#9ca3af",
};

const fallback_source_palette = [
  "#60a5fa",
  "#34d399",
  "#f59e0b",
  "#f87171",
  "#a78bfa",
  "#22d3ee",
];

function normalize_period(value: unknown): analytics_period {
  if (value === "7d" || value === "30d" || value === "90d") {
    return value;
  }
  return "30d";
}

function format_play_day(iso_day: string) {
  const parsed = new Date(iso_day);
  if (Number.isNaN(parsed.getTime())) {
    return iso_day;
  }
  return parsed.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function format_source_label(source: string) {
  const normalized = source.trim().toLowerCase();
  if (normalized === "search") {
    return "Поиск";
  }
  if (normalized === "playlist") {
    return "Плейлист";
  }
  if (normalized === "recommendations") {
    return "Рекомендации";
  }
  if (normalized === "unknown") {
    return "Неизвестно";
  }
  return source;
}

function format_country_label(country_code: string) {
  if (!country_code || country_code.toLowerCase() === "unknown") {
    return "Unknown";
  }
  return country_code.toUpperCase();
}

function format_number(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export default function ArtistAnalyticsPage() {
  const {
    handleTrackSelect,
    currentTrackIndex,
    hasTrackSelected,
    queue,
    tracks: player_tracks,
  } = usePlayer();
  const {
    gridRef,
    leftWidth,
    rightWidth,
    onLeftResizeStart,
    onRightResizeStart,
  } = useResizableSidebars();

  const [period, set_period] = useState<analytics_period>("30d");
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [plays_items, set_plays_items] = useState<artist_plays_item[]>([]);
  const [top_tracks_items, set_top_tracks_items] = useState<artist_top_track_item[]>([]);
  const [sources_items, set_sources_items] = useState<artist_source_item[]>([]);
  const [geography_items, set_geography_items] = useState<artist_geography_item[]>([]);
  const [artist_id, set_artist_id] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load_analytics = async () => {
      set_is_loading(true);
      set_error_message(null);

      try {
        const query = `?period=${period}`;
        const [plays_res, top_tracks_res, geography_res, sources_res] =
          await Promise.all([
            apiFetch(`/api/artist/analytics/plays${query}`),
            apiFetch(`/api/artist/analytics/top_tracks${query}`),
            apiFetch(`/api/artist/analytics/geography${query}`),
            apiFetch(`/api/artist/analytics/sources${query}`),
          ]);

        const responses = [plays_res, top_tracks_res, geography_res, sources_res];
        if (responses.some((response) => response.status === 401)) {
          if (mounted) {
            set_error_message("Войдите в аккаунт артиста, чтобы видеть аналитику.");
          }
          return;
        }

        if (!responses.every((response) => response.ok)) {
          throw new Error("ANALYTICS_REQUEST_FAILED");
        }

        const [
          plays_data,
          top_tracks_data,
          geography_data,
          sources_data,
        ] = (await Promise.all([
          plays_res.json(),
          top_tracks_res.json(),
          geography_res.json(),
          sources_res.json(),
        ])) as [
          artist_plays_response,
          artist_analytics_response<artist_top_track_item>,
          artist_analytics_response<artist_geography_item>,
          artist_analytics_response<artist_source_item>,
        ];

        if (!mounted) {
          return;
        }

        set_plays_items(Array.isArray(plays_data.items) ? plays_data.items : []);
        set_top_tracks_items(
          Array.isArray(top_tracks_data.items) ? top_tracks_data.items : [],
        );
        set_geography_items(
          Array.isArray(geography_data.items) ? geography_data.items : [],
        );
        set_sources_items(Array.isArray(sources_data.items) ? sources_data.items : []);
        set_artist_id(plays_data.artist_id ?? top_tracks_data.artist_id ?? null);
        set_period(normalize_period(plays_data.period));
      } catch (err) {
        console.error("Artist analytics page error:", err);
        if (mounted) {
          set_error_message("Не удалось загрузить аналитику. Попробуйте позже.");
        }
      } finally {
        if (mounted) {
          set_is_loading(false);
        }
      }
    };

    load_analytics();

    return () => {
      mounted = false;
    };
  }, [period]);

  const queue_items = useMemo(() => {
    const active_queue = queue.length ? queue : player_tracks;
    return active_queue.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: formatDuration(track.durationMs),
      cover: track.cover ?? null,
    }));
  }, [queue, player_tracks]);

  const current_track = useMemo(() => {
    if (!hasTrackSelected) {
      return null;
    }
    return queue_items[currentTrackIndex] ?? queue_items[0] ?? null;
  }, [hasTrackSelected, currentTrackIndex, queue_items]);

  const grid_style = useMemo(
    () =>
      ({
        "--sidebar-left": `${leftWidth}px`,
        "--sidebar-right": `${rightWidth}px`,
      }) as CSSProperties,
    [leftWidth, rightWidth],
  );

  const line_chart_data = useMemo(
    () =>
      plays_items.map((item) => ({
        ...item,
        play_day_label: format_play_day(item.play_date),
      })),
    [plays_items],
  );

  const top_tracks_chart_data = useMemo(
    () =>
      top_tracks_items.map((item) => ({
        ...item,
        track_label:
          item.track_title.length > 20
            ? `${item.track_title.slice(0, 20)}...`
            : item.track_title,
      })),
    [top_tracks_items],
  );

  const total_plays = useMemo(
    () =>
      plays_items.reduce(
        (accumulator, item) => accumulator + (item.plays_count || 0),
        0,
      ),
    [plays_items],
  );

  const total_listeners = useMemo(() => {
    return geography_items.reduce(
      (accumulator, item) => accumulator + item.listeners_count,
      0,
    );
  }, [geography_items]);

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <div className="main-grid" ref={gridRef} style={grid_style}>
          <HomeSidebar />
          <div
            className="resize-handle resize-handle--left"
            onPointerDown={onLeftResizeStart}
            aria-hidden="true"
          />

          <main className="page-main analytics-main">
            <section className="page-hero analytics-hero">
              <div className="page-hero-badge">Artist analytics</div>
              <h1 className="page-hero-title">Аналитика прослушиваний</h1>
              <p className="page-hero-subtitle">
                Динамика прослушиваний, топ треки, источники трафика и география
                аудитории.
              </p>

              <div className="analytics-periods">
                {period_options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`analytics-period-button${period === option.key ? " active" : ""}`}
                    onClick={() => set_period(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="analytics-summary">
                <div className="analytics-summary-card">
                  <span>Прослушивания</span>
                  <strong>{format_number(total_plays)}</strong>
                </div>
                <div className="analytics-summary-card">
                  <span>Слушатели (оценка)</span>
                  <strong>{format_number(total_listeners)}</strong>
                </div>
                <div className="analytics-summary-card">
                  <span>Artist id</span>
                  <strong>{artist_id ? `${artist_id.slice(0, 8)}...` : "n/a"}</strong>
                </div>
              </div>
            </section>

            {is_loading ? (
              <section className="analytics-state-card">Загружаю аналитику...</section>
            ) : error_message ? (
              <section className="analytics-state-card analytics-state-card--error">
                {error_message}
              </section>
            ) : (
              <section className="analytics-grid">
                <article className="analytics-card analytics-card--wide">
                  <div className="analytics-card-header">
                    <h2>Прослушивания по дням</h2>
                  </div>
                  <div className="analytics-chart">
                    {line_chart_data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={line_chart_data}>
                          <CartesianGrid
                            strokeDasharray="4 4"
                            stroke="rgba(255, 255, 255, 0.08)"
                          />
                          <XAxis
                            dataKey="play_day_label"
                            stroke="#9ca3af"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ stroke: "rgba(96, 165, 250, 0.25)" }}
                            contentStyle={{
                              background: "#10151f",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "10px",
                            }}
                            labelStyle={{ color: "#d1d5db" }}
                            formatter={(value: number) => [
                              format_number(Number(value)),
                              "Прослушивания",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="plays_count"
                            stroke="#60a5fa"
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 0, fill: "#60a5fa" }}
                            activeDot={{ r: 5, fill: "#93c5fd" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="analytics-empty">За выбранный период нет данных.</div>
                    )}
                  </div>
                </article>

                <article className="analytics-card">
                  <div className="analytics-card-header">
                    <h2>Топ треки</h2>
                  </div>
                  <div className="analytics-chart">
                    {top_tracks_chart_data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={top_tracks_chart_data}
                          layout="vertical"
                          margin={{ top: 10, right: 10, bottom: 10, left: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="4 4"
                            stroke="rgba(255, 255, 255, 0.08)"
                          />
                          <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="track_label"
                            width={120}
                            stroke="#9ca3af"
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(96, 165, 250, 0.12)" }}
                            contentStyle={{
                              background: "#10151f",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "10px",
                            }}
                            formatter={(value: number) => [
                              format_number(Number(value)),
                              "Прослушивания",
                            ]}
                          />
                          <Bar dataKey="plays_count" fill="#34d399" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="analytics-empty">Пока нет треков с прослушиваниями.</div>
                    )}
                  </div>
                </article>

                <article className="analytics-card">
                  <div className="analytics-card-header">
                    <h2>Источники</h2>
                  </div>
                  <div className="analytics-chart">
                    {sources_items.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={sources_items}
                            dataKey="plays_count"
                            nameKey="source"
                            innerRadius={58}
                            outerRadius={96}
                            paddingAngle={2}
                          >
                            {sources_items.map((item, index) => (
                              <Cell
                                key={`${item.source}-${index}`}
                                fill={
                                  source_colors[item.source] ??
                                  fallback_source_palette[index % fallback_source_palette.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "#10151f",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "10px",
                            }}
                            formatter={(value: number, label: string) => [
                              format_number(Number(value)),
                              format_source_label(String(label)),
                            ]}
                          />
                          <Legend
                            formatter={(value: string | number) => (
                              <span className="analytics-legend-label">
                                {format_source_label(String(value))}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="analytics-empty">Источники пока не определены.</div>
                    )}
                  </div>
                </article>

                <article className="analytics-card analytics-card--table">
                  <div className="analytics-card-header">
                    <h2>Топ города и страны</h2>
                  </div>
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Страна</th>
                          <th>Город</th>
                          <th>Прослушивания</th>
                          <th>Слушатели</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geography_items.length > 0 ? (
                          geography_items.slice(0, 20).map((item, index) => (
                            <tr key={`${item.country_code}-${item.city_name}-${index}`}>
                              <td>{index + 1}</td>
                              <td>{format_country_label(item.country_code)}</td>
                              <td>{item.city_name || "Unknown"}</td>
                              <td>{format_number(item.plays_count)}</td>
                              <td>{format_number(item.listeners_count)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="analytics-table-empty">
                              География пока не заполнена.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            )}
          </main>

          <div
            className="resize-handle resize-handle--right"
            onPointerDown={onRightResizeStart}
            aria-hidden="true"
          />
          {current_track ? (
            <NowPlayingPanel
              currentTrack={current_track}
              queue={queue_items}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={handleTrackSelect}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
