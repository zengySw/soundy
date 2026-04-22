import { pg_query } from "../db_pg.js";

export async function record_listening_event({
  user_id = null,
  track_id,
  artist_id = null,
  source = "unknown",
  country_code = null,
  city = null,
}) {
  if (!track_id) {
    return;
  }

  await pg_query(
    `
      INSERT INTO listening_events (
        user_id,
        track_id,
        artist_id,
        source,
        country_code,
        city
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [user_id, track_id, artist_id, source, country_code, city],
  );
}
