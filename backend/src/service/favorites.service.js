import { pg_query } from "../db_pg.js";

function to_int_or_null(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export async function list_user_favorites(user_id) {
  const result = await pg_query(
    `
      SELECT
        t.id::text AS id,
        t.title,
        t.duration_ms,
        t.path,
        f.added_at
      FROM favorites f
      INNER JOIN tracks t ON t.id = f.track_id
      WHERE f.user_id::text = $1
      ORDER BY f.added_at DESC
    `,
    [user_id],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title || "Unknown track"),
    duration_ms: to_int_or_null(row.duration_ms),
    path: row.path ? String(row.path) : null,
    added_at: row.added_at ? new Date(row.added_at).toISOString() : null,
  }));
}

export async function add_track_to_favorites(user_id, track_id) {
  const track_result = await pg_query(
    `
      SELECT id
      FROM tracks
      WHERE id::text = $1
      LIMIT 1
    `,
    [track_id],
  );
  if (track_result.rows.length === 0) {
    throw new Error("TRACK_NOT_FOUND");
  }

  try {
    await pg_query(
      `
        INSERT INTO favorites (user_id, track_id)
        VALUES ($1::uuid, $2::uuid)
      `,
      [user_id, track_id],
    );
    return { added: true };
  } catch (error) {
    if (error?.code === "23505") {
      return { added: false };
    }
    throw error;
  }
}

export async function remove_track_from_favorites(user_id, track_id) {
  const result = await pg_query(
    `
      DELETE FROM favorites
      WHERE user_id::text = $1
        AND track_id::text = $2
    `,
    [user_id, track_id],
  );

  return { removed: result.rowCount > 0 };
}
