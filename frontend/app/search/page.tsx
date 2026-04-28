"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import { apiFetch } from "@/lib/api";
import { usePlayer } from "@/context/PlayerContext";
import type {
  search_item,
  search_response,
  search_tab_type,
} from "@/types/search";

const search_tabs: Array<{ id: search_tab_type; label: string }> = [
  { id: "all", label: "All" },
  { id: "tracks", label: "Tracks" },
  { id: "artists", label: "Artists" },
  { id: "playlists", label: "Playlists" },
];

const entity_labels: Record<search_item["entity_type"], string> = {
  tracks: "Track",
  artists: "Artist",
  playlists: "Playlist",
};

function is_search_tab_type(value: string | null): value is search_tab_type {
  return value === "all" || value === "tracks" || value === "artists" || value === "playlists";
}

function parse_headline_to_nodes(value: string): ReactNode[] {
  const tokens = value.split(/(<\/?mark>)/gi).filter(Boolean);
  const nodes: ReactNode[] = [];
  let is_marked = false;

  tokens.forEach((token, token_index) => {
    const normalized_token = token.toLowerCase();
    if (normalized_token === "<mark>") {
      is_marked = true;
      return;
    }
    if (normalized_token === "</mark>") {
      is_marked = false;
      return;
    }
    if (!token) {
      return;
    }
    if (is_marked) {
      nodes.push(<mark key={`mark-${token_index}`}>{token}</mark>);
      return;
    }
    nodes.push(<span key={`text-${token_index}`}>{token}</span>);
  });

  return nodes;
}

function render_highlighted_text(highlight_value: string | null, fallback_value: string) {
  const trimmed_highlight = String(highlight_value ?? "").trim();
  if (!trimmed_highlight) {
    return <span>{fallback_value}</span>;
  }
  return <>{parse_headline_to_nodes(trimmed_highlight)}</>;
}

function build_search_path(query_text: string, search_type: search_tab_type, search_limit: number) {
  const params = new URLSearchParams();
  params.set("q", query_text);
  params.set("type", search_type);
  params.set("limit", String(search_limit));
  return `/api/search?${params.toString()}`;
}

export default function SearchPage() {
  const router = useRouter();
  const [search_input, set_search_input] = useState("");
  const [search_tab, set_search_tab] = useState<search_tab_type>("all");
  const [debounced_query_text, set_debounced_query_text] = useState("");
  const [has_initialized_from_url, set_has_initialized_from_url] =
    useState(false);
  const [result_items, set_result_items] = useState<search_item[]>([]);
  const [suggestion_items, set_suggestion_items] = useState<search_item[]>([]);
  const [is_loading_results, set_is_loading_results] = useState(false);
  const [fetch_error_message, set_fetch_error_message] = useState<string | null>(
    null,
  );
  const [is_dropdown_open, set_is_dropdown_open] = useState(false);
  const dropdown_ref = useRef<HTMLDivElement | null>(null);
  const { tracks, handleCardPlay: handle_card_play } = usePlayer();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const query_text = (params.get("q") ?? "").trim();
    const type_value = params.get("type");
    const resolved_tab = is_search_tab_type(type_value) ? type_value : "all";

    set_search_input(query_text);
    set_debounced_query_text(query_text);
    set_search_tab(resolved_tab);
    set_has_initialized_from_url(true);
  }, []);

  useEffect(() => {
    const timeout_id = window.setTimeout(() => {
      set_debounced_query_text(search_input.trim());
    }, 300);
    return () => {
      window.clearTimeout(timeout_id);
    };
  }, [search_input]);

  useEffect(() => {
    if (!has_initialized_from_url) {
      return;
    }
    const params = new URLSearchParams();
    if (debounced_query_text) {
      params.set("q", debounced_query_text);
    }
    if (search_tab !== "all") {
      params.set("type", search_tab);
    }
    const next_url = params.size > 0 ? `/search?${params.toString()}` : "/search";
    router.replace(next_url, { scroll: false });
  }, [debounced_query_text, search_tab, router, has_initialized_from_url]);

  useEffect(() => {
    const handle_document_click = (event: MouseEvent) => {
      if (!dropdown_ref.current) {
        return;
      }
      if (dropdown_ref.current.contains(event.target as Node)) {
        return;
      }
      set_is_dropdown_open(false);
    };
    document.addEventListener("mousedown", handle_document_click);
    return () => {
      document.removeEventListener("mousedown", handle_document_click);
    };
  }, []);

  useEffect(() => {
    let is_cancelled = false;

    if (!debounced_query_text) {
      set_result_items([]);
      set_suggestion_items([]);
      set_fetch_error_message(null);
      set_is_loading_results(false);
      return () => {
        is_cancelled = true;
      };
    }

    const load_results = async () => {
      try {
        set_is_loading_results(true);
        set_fetch_error_message(null);

        const [result_response, suggestion_response] = await Promise.all([
          apiFetch(build_search_path(debounced_query_text, search_tab, 40)),
          apiFetch(build_search_path(debounced_query_text, "all", 5)),
        ]);

        if (!result_response.ok) {
          const error_payload = await result_response.json().catch(() => ({}));
          const message =
            typeof error_payload?.message === "string"
              ? error_payload.message
              : "Search request failed";
          throw new Error(message);
        }

        const result_payload = (await result_response.json()) as search_response;
        const suggestion_payload: search_response = suggestion_response.ok
          ? ((await suggestion_response.json()) as search_response)
          : {
              query_text: debounced_query_text,
              search_type: "all",
              items: [],
            };

        if (is_cancelled) {
          return;
        }

        set_result_items(Array.isArray(result_payload.items) ? result_payload.items : []);
        set_suggestion_items(
          Array.isArray(suggestion_payload.items)
            ? suggestion_payload.items.slice(0, 5)
            : [],
        );
      } catch (err: unknown) {
        if (is_cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to load search results";
        set_fetch_error_message(message);
        set_result_items([]);
        set_suggestion_items([]);
      } finally {
        if (!is_cancelled) {
          set_is_loading_results(false);
        }
      }
    };

    void load_results();

    return () => {
      is_cancelled = true;
    };
  }, [debounced_query_text, search_tab]);

  const grouped_items = useMemo(
    () => ({
      tracks: result_items.filter((item) => item.entity_type === "tracks"),
      artists: result_items.filter((item) => item.entity_type === "artists"),
      playlists: result_items.filter((item) => item.entity_type === "playlists"),
    }),
    [result_items],
  );

  const handle_result_open = useCallback(
    (item: search_item) => {
      if (item.entity_type === "tracks") {
        const track_index = tracks.findIndex((track) => track.id === item.id);
        if (track_index >= 0) {
          void handle_card_play(track_index);
          return;
        }
      }
      if (item.entity_type === "playlists") {
        router.push(`/playlists/${item.id}`);
        return;
      }
      if (item.entity_type === "artists") {
        router.push(`/user/${item.id}`);
      }
    },
    [router, tracks, handle_card_play],
  );

  const handle_suggestion_click = useCallback((item: search_item) => {
    set_search_input(item.title);
    set_search_tab(item.entity_type);
    set_is_dropdown_open(false);
  }, []);

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="search-page-main">
          <section className="page-hero search-hero">
            <div className="page-hero-badge">Поиск</div>
            <h1 className="page-hero-title">Unified Search</h1>
            <p className="page-hero-subtitle">
              Tracks, artists and playlists in one place with ranked full-text results.
            </p>

            <div className="search-input-shell" ref={dropdown_ref}>
              <input
                className="search-input"
                placeholder="Search tracks, artists, playlists..."
                value={search_input}
                onFocus={() => set_is_dropdown_open(true)}
                onChange={(event) => set_search_input(event.target.value)}
              />

              {is_dropdown_open && debounced_query_text && suggestion_items.length > 0 && (
                <div className="search-dropdown">
                  {suggestion_items.map((item) => (
                    <button
                      key={`${item.entity_type}-${item.id}`}
                      type="button"
                      className="search-dropdown-item"
                      onClick={() => handle_suggestion_click(item)}
                    >
                      <span className={`search-dropdown-type type-${item.entity_type}`}>
                        {entity_labels[item.entity_type]}
                      </span>
                      <span className="search-dropdown-title">
                        {render_highlighted_text(item.highlight, item.title)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="search-tabs">
              {search_tabs.map((tab_item) => (
                <button
                  key={tab_item.id}
                  type="button"
                  className={`search-tab-button${
                    search_tab === tab_item.id ? " active" : ""
                  }`}
                  onClick={() => set_search_tab(tab_item.id)}
                >
                  {tab_item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="search-results-shell">
            {!debounced_query_text && (
              <div className="search-state-card">
                Start typing to search tracks, artists and playlists.
              </div>
            )}

            {debounced_query_text && is_loading_results && (
              <div className="search-state-card">Loading search results...</div>
            )}

            {debounced_query_text && fetch_error_message && (
              <div className="search-state-card search-state-card--error">
                {fetch_error_message}
              </div>
            )}

            {debounced_query_text &&
              !is_loading_results &&
              !fetch_error_message &&
              result_items.length === 0 && (
                <div className="search-state-card">No matches found.</div>
              )}

            {debounced_query_text &&
              !is_loading_results &&
              !fetch_error_message &&
              result_items.length > 0 &&
              search_tab !== "all" && (
                <div className="search-results-grid">
                  {result_items.map((item) => (
                    <button
                      key={`${item.entity_type}-${item.id}`}
                      type="button"
                      className="search-result-card"
                      onClick={() => handle_result_open(item)}
                    >
                      <div className="search-result-card-head">
                        <span className={`search-result-type type-${item.entity_type}`}>
                          {entity_labels[item.entity_type]}
                        </span>
                      </div>
                      <div className="search-result-title">
                        {render_highlighted_text(item.highlight, item.title)}
                      </div>
                      {item.subtitle && (
                        <div className="search-result-subtitle">
                          {render_highlighted_text(
                            item.subtitle_highlight,
                            item.subtitle,
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

            {debounced_query_text &&
              !is_loading_results &&
              !fetch_error_message &&
              result_items.length > 0 &&
              search_tab === "all" && (
                <div className="search-groups">
                  {(["tracks", "artists", "playlists"] as const).map((group_key) => {
                    const items = grouped_items[group_key];
                    if (items.length === 0) {
                      return null;
                    }
                    return (
                      <div key={group_key} className="search-group">
                        <div className="search-group-header">
                          <h2>{entity_labels[group_key]}</h2>
                          <span>{items.length}</span>
                        </div>
                        <div className="search-results-grid">
                          {items.map((item) => (
                            <button
                              key={`${item.entity_type}-${item.id}`}
                              type="button"
                              className="search-result-card"
                              onClick={() => handle_result_open(item)}
                            >
                              <div className="search-result-card-head">
                                <span className={`search-result-type type-${item.entity_type}`}>
                                  {entity_labels[item.entity_type]}
                                </span>
                              </div>
                              <div className="search-result-title">
                                {render_highlighted_text(item.highlight, item.title)}
                              </div>
                              {item.subtitle && (
                                <div className="search-result-subtitle">
                                  {render_highlighted_text(
                                    item.subtitle_highlight,
                                    item.subtitle,
                                  )}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </section>
        </main>
      </div>
    </>
  );
}
