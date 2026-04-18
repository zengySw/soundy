export type search_entity_type = "tracks" | "artists" | "playlists";

export type search_tab_type = "all" | search_entity_type;

export type search_item = {
  entity_type: search_entity_type;
  id: string;
  title: string;
  subtitle: string | null;
  highlight: string | null;
  subtitle_highlight: string | null;
  rank: number;
};

export type search_response = {
  query_text: string;
  search_type: search_tab_type;
  items: search_item[];
};
