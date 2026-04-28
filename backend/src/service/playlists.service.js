import { randomUUID } from "crypto";
import { pg_query } from "../db_pg.js";

function to_int_or_null(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function normalize_text(value, max_length = 255) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, max_length);
}

function normalize_playlist_role(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "owner" || normalized === "editor" || normalized === "viewer") {
    return normalized;
  }
  return null;
}

function normalize_invite_role(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "editor" || normalized === "viewer") {
    return normalized;
  }
  return "editor";
}

function playlist_role_priority(role) {
  if (role === "owner") {
    return 3;
  }
  if (role === "editor") {
    return 2;
  }
  if (role === "viewer") {
    return 1;
  }
  return 0;
}

function resolve_stronger_role(left_role, right_role) {
  return playlist_role_priority(left_role) >= playlist_role_priority(right_role)
    ? left_role
    : right_role;
}

function normalize_expires_days(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return 7;
  }
  return Math.max(1, Math.min(parsed, 30));
}

async function touch_playlist(playlist_id) {
  await pg_query(
    `
      UPDATE playlists
      SET updated_at = NOW()
      WHERE id::text = $1
    `,
    [playlist_id],
  );
}

async function get_playlist_access(playlist_id, user_id) {
  const result = await pg_query(
    `
      SELECT
        p.id::text AS id,
        p.owner_id::text AS owner_id,
        p.name,
        p.description,
        CASE
          WHEN p.owner_id::text = $2 THEN 'owner'
          ELSE pc.role
        END AS my_role
      FROM playlists p
      LEFT JOIN playlist_collaborators pc
        ON pc.playlist_id = p.id
       AND pc.user_id::text = $2
      WHERE p.id::text = $1
      LIMIT 1
    `,
    [playlist_id, user_id],
  );

  return result.rows[0] ?? null;
}

function ensure_playlist_role_can_edit(role) {
  return role === "owner" || role === "editor";
}

async function ensure_playlist_access(playlist_id, user_id, { require_edit = false } = {}) {
  const playlist = await get_playlist_access(playlist_id, user_id);
  if (!playlist) {
    throw new Error("PLAYLIST_NOT_FOUND");
  }

  const my_role = normalize_playlist_role(playlist.my_role);
  if (!my_role) {
    throw new Error("PLAYLIST_FORBIDDEN");
  }

  if (require_edit && !ensure_playlist_role_can_edit(my_role)) {
    throw new Error("PLAYLIST_FORBIDDEN");
  }

  return {
    ...playlist,
    my_role,
  };
}

async function resequence_playlist_tracks(playlist_id) {
  await pg_query(
    `
      WITH ordered AS (
        SELECT
          track_id,
          ROW_NUMBER() OVER (
            ORDER BY position NULLS LAST, added_at ASC, track_id ASC
          ) AS new_position
        FROM playlist_tracks
        WHERE playlist_id::text = $1
      )
      UPDATE playlist_tracks pt
      SET position = ordered.new_position
      FROM ordered
      WHERE pt.playlist_id::text = $1
        AND pt.track_id = ordered.track_id
    `,
    [playlist_id],
  );
}

export async function list_playlists_for_user(user_id) {
  const result = await pg_query(
    `
      SELECT
        p.id::text AS id,
        p.name,
        COALESCE(COUNT(pt.track_id), 0)::int AS track_count,
        p.updated_at
      FROM playlists p
      LEFT JOIN playlist_collaborators pc
        ON pc.playlist_id = p.id
       AND pc.user_id::text = $1
      LEFT JOIN playlist_tracks pt
        ON pt.playlist_id = p.id
      WHERE p.owner_id::text = $1
         OR pc.user_id IS NOT NULL
      GROUP BY p.id
      ORDER BY p.updated_at DESC, p.created_at DESC
    `,
    [user_id],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name || "Playlist"),
    track_count: to_int_or_null(row.track_count) ?? 0,
  }));
}

export async function create_playlist_for_user(user_id, payload) {
  const name = normalize_text(payload?.name, 255);
  const description = normalize_text(payload?.description, 1200) || null;

  if (!name) {
    throw new Error("PLAYLIST_NAME_REQUIRED");
  }

  let created_row;
  try {
    const create_result = await pg_query(
      `
        INSERT INTO playlists (owner_id, name, description)
        VALUES ($1::uuid, $2, $3)
        RETURNING id::text AS id, name, description
      `,
      [user_id, name, description],
    );
    created_row = create_result.rows[0];
  } catch (error) {
    if (error?.code === "23505") {
      throw new Error("PLAYLIST_NAME_CONFLICT");
    }
    throw error;
  }

  if (!created_row) {
    throw new Error("PLAYLIST_CREATE_FAILED");
  }

  try {
    await pg_query(
      `
        INSERT INTO playlist_collaborators (playlist_id, user_id, role)
        VALUES ($1::uuid, $2::uuid, 'owner')
        ON CONFLICT (playlist_id, user_id)
        DO UPDATE SET role = 'owner'
      `,
      [created_row.id, user_id],
    );
  } catch (error) {
    if (error?.code !== "42P01") {
      throw error;
    }
  }

  return {
    id: String(created_row.id),
    name: String(created_row.name || name),
    description: created_row.description ? String(created_row.description) : null,
    track_count: 0,
  };
}

export async function get_playlist_payload_for_user(playlist_id, user_id) {
  const playlist = await ensure_playlist_access(playlist_id, user_id);

  const tracks_result = await pg_query(
    `
      SELECT
        t.id::text AS id,
        t.title,
        t.duration_ms,
        t.path,
        pt.added_at,
        pt.position
      FROM playlist_tracks pt
      INNER JOIN tracks t ON t.id = pt.track_id
      WHERE pt.playlist_id::text = $1
      ORDER BY pt.position NULLS LAST, pt.added_at DESC, t.title ASC
    `,
    [playlist_id],
  );

  const collaborators_result = await pg_query(
    `
      SELECT
        pc.user_id::text AS user_id,
        pc.role,
        u.username,
        u.avatar_url
      FROM playlist_collaborators pc
      INNER JOIN users u ON u.id = pc.user_id
      WHERE pc.playlist_id::text = $1
    `,
    [playlist_id],
  );

  const owner_result = await pg_query(
    `
      SELECT id::text AS user_id, username, avatar_url
      FROM users
      WHERE id::text = $1
      LIMIT 1
    `,
    [playlist.owner_id],
  );

  const collaborators_by_id = new Map();
  for (const row of collaborators_result.rows) {
    collaborators_by_id.set(String(row.user_id), {
      user_id: String(row.user_id),
      role: normalize_playlist_role(row.role) || "viewer",
      username: row.username ? String(row.username) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    });
  }

  const owner = owner_result.rows[0];
  if (owner) {
    collaborators_by_id.set(String(owner.user_id), {
      user_id: String(owner.user_id),
      role: "owner",
      username: owner.username ? String(owner.username) : null,
      avatar_url: owner.avatar_url ? String(owner.avatar_url) : null,
    });
  }

  const tracks = tracks_result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title || "Unknown track"),
    duration_ms: to_int_or_null(row.duration_ms),
    path: row.path ? String(row.path) : null,
    added_at: row.added_at ? new Date(row.added_at).toISOString() : null,
    position: to_int_or_null(row.position),
  }));

  return {
    id: String(playlist.id),
    name: String(playlist.name || "Playlist"),
    description: playlist.description ? String(playlist.description) : null,
    my_role: playlist.my_role,
    collaborators: Array.from(collaborators_by_id.values()),
    tracks,
  };
}

export async function add_track_to_playlist_for_user(playlist_id, user_id, payload) {
  const track_id = String(payload?.trackId ?? payload?.track_id ?? "").trim();
  if (!track_id) {
    throw new Error("TRACK_ID_REQUIRED");
  }

  await ensure_playlist_access(playlist_id, user_id, { require_edit: true });

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

  const next_position_result = await pg_query(
    `
      SELECT COALESCE(MAX(position), 0) + 1 AS next_position
      FROM playlist_tracks
      WHERE playlist_id::text = $1
    `,
    [playlist_id],
  );
  const next_position = to_int_or_null(next_position_result.rows[0]?.next_position) ?? 1;

  const insert_result = await pg_query(
    `
      INSERT INTO playlist_tracks (playlist_id, track_id, added_by, position)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
      ON CONFLICT (playlist_id, track_id)
      DO NOTHING
      RETURNING track_id::text AS track_id
    `,
    [playlist_id, track_id, user_id, next_position],
  );

  if (insert_result.rowCount === 0) {
    return { added: false, track: null };
  }

  await touch_playlist(playlist_id);

  const track_payload_result = await pg_query(
    `
      SELECT
        t.id::text AS id,
        t.title,
        t.duration_ms,
        t.path,
        pt.added_at,
        pt.position
      FROM playlist_tracks pt
      INNER JOIN tracks t ON t.id = pt.track_id
      WHERE pt.playlist_id::text = $1
        AND pt.track_id::text = $2
      LIMIT 1
    `,
    [playlist_id, track_id],
  );

  const row = track_payload_result.rows[0] ?? null;
  return {
    added: true,
    track: row
      ? {
          id: String(row.id),
          title: String(row.title || "Unknown track"),
          duration_ms: to_int_or_null(row.duration_ms),
          path: row.path ? String(row.path) : null,
          added_at: row.added_at ? new Date(row.added_at).toISOString() : null,
          position: to_int_or_null(row.position),
        }
      : null,
  };
}

export async function remove_track_from_playlist_for_user(playlist_id, user_id, track_id) {
  await ensure_playlist_access(playlist_id, user_id, { require_edit: true });

  const delete_result = await pg_query(
    `
      DELETE FROM playlist_tracks
      WHERE playlist_id::text = $1
        AND track_id::text = $2
      RETURNING track_id::text AS track_id
    `,
    [playlist_id, track_id],
  );

  if (delete_result.rowCount === 0) {
    return { removed: false };
  }

  await resequence_playlist_tracks(playlist_id);
  await touch_playlist(playlist_id);
  return { removed: true };
}

export async function reorder_playlist_tracks_for_user(playlist_id, user_id, new_order) {
  await ensure_playlist_access(playlist_id, user_id, { require_edit: true });

  if (!Array.isArray(new_order) || new_order.length === 0) {
    throw new Error("PLAYLIST_ORDER_INVALID");
  }

  const normalized_order = new_order.map((value) => String(value || "").trim()).filter(Boolean);
  if (normalized_order.length !== new_order.length) {
    throw new Error("PLAYLIST_ORDER_INVALID");
  }

  const unique_values = new Set(normalized_order);
  if (unique_values.size !== normalized_order.length) {
    throw new Error("PLAYLIST_ORDER_INVALID");
  }

  const current_tracks_result = await pg_query(
    `
      SELECT track_id::text AS track_id
      FROM playlist_tracks
      WHERE playlist_id::text = $1
    `,
    [playlist_id],
  );
  const current_track_ids = current_tracks_result.rows.map((row) => String(row.track_id));

  if (current_track_ids.length !== normalized_order.length) {
    throw new Error("PLAYLIST_ORDER_INVALID");
  }

  const current_track_id_set = new Set(current_track_ids);
  for (const track_id of normalized_order) {
    if (!current_track_id_set.has(track_id)) {
      throw new Error("PLAYLIST_ORDER_INVALID");
    }
  }

  await pg_query(
    `
      WITH input AS (
        SELECT track_id, ordinality::int AS position
        FROM unnest($2::text[]) WITH ORDINALITY AS u(track_id, ordinality)
      )
      UPDATE playlist_tracks pt
      SET position = input.position
      FROM input
      WHERE pt.playlist_id::text = $1
        AND pt.track_id::text = input.track_id
    `,
    [playlist_id, normalized_order],
  );

  await touch_playlist(playlist_id);

  return {
    reordered: true,
    new_order: normalized_order,
  };
}

export async function create_playlist_invite_for_user(playlist_id, user_id, payload) {
  await ensure_playlist_access(playlist_id, user_id, { require_edit: true });

  const role = normalize_invite_role(payload?.role);
  const expires_days = normalize_expires_days(payload?.expires_days);
  const token = randomUUID().replace(/-/g, "");
  const expires_at = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000);

  await pg_query(
    `
      INSERT INTO playlist_invites (
        playlist_id,
        created_by,
        token,
        role,
        expires_at,
        revoked
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, FALSE)
    `,
    [playlist_id, user_id, token, role, expires_at],
  );

  return {
    playlist_id,
    token,
    role,
    expires_at: expires_at.toISOString(),
  };
}

export async function accept_playlist_invite_for_user(token, user_id) {
  const normalized_token = String(token || "").trim();
  if (!normalized_token) {
    throw new Error("PLAYLIST_INVITE_TOKEN_REQUIRED");
  }

  const invite_result = await pg_query(
    `
      SELECT
        id::text AS id,
        playlist_id::text AS playlist_id,
        role,
        expires_at,
        revoked
      FROM playlist_invites
      WHERE token = $1
      LIMIT 1
    `,
    [normalized_token],
  );
  const invite = invite_result.rows[0] ?? null;
  if (!invite) {
    throw new Error("PLAYLIST_INVITE_NOT_FOUND");
  }
  if (invite.revoked) {
    throw new Error("PLAYLIST_INVITE_REVOKED");
  }
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    throw new Error("PLAYLIST_INVITE_EXPIRED");
  }

  const playlist_result = await pg_query(
    `
      SELECT owner_id::text AS owner_id
      FROM playlists
      WHERE id::text = $1
      LIMIT 1
    `,
    [invite.playlist_id],
  );
  const playlist = playlist_result.rows[0] ?? null;
  if (!playlist) {
    throw new Error("PLAYLIST_NOT_FOUND");
  }

  const requested_role = normalize_invite_role(invite.role);
  const owner_id = String(playlist.owner_id || "").trim();

  const current_role_result = await pg_query(
    `
      SELECT role
      FROM playlist_collaborators
      WHERE playlist_id::text = $1
        AND user_id::text = $2
      LIMIT 1
    `,
    [invite.playlist_id, user_id],
  );
  const current_role = normalize_playlist_role(current_role_result.rows[0]?.role);

  let next_role = user_id === owner_id ? "owner" : requested_role;
  if (current_role) {
    next_role = resolve_stronger_role(current_role, next_role);
  }

  await pg_query(
    `
      INSERT INTO playlist_collaborators (playlist_id, user_id, role)
      VALUES ($1::uuid, $2::uuid, $3)
      ON CONFLICT (playlist_id, user_id)
      DO UPDATE SET role = EXCLUDED.role
    `,
    [invite.playlist_id, user_id, next_role],
  );

  await pg_query(
    `
      UPDATE playlist_invites
      SET revoked = TRUE
      WHERE id::text = $1
    `,
    [invite.id],
  );

  await touch_playlist(invite.playlist_id);

  return {
    accepted: true,
    playlist_id: invite.playlist_id,
    role: next_role,
  };
}
