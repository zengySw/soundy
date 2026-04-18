export type analytics_period = "7d" | "30d" | "90d";

export type artist_plays_item = {
  play_date: string;
  plays_count: number;
};

export type artist_top_track_item = {
  track_id: string;
  track_title: string;
  plays_count: number;
};

export type artist_source_item = {
  source: string;
  plays_count: number;
};

export type artist_geography_item = {
  country_code: string;
  city_name: string;
  plays_count: number;
  listeners_count: number;
};

export type artist_analytics_response<TItem> = {
  period: analytics_period;
  period_days: number;
  artist_id: string;
  items: TItem[];
};

export type artist_plays_response = artist_analytics_response<artist_plays_item> & {
  total_plays?: number;
};
