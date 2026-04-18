import { pg_query } from "../db_pg.js";

const default_theme_config = {
  primary: "#6366f1",
  accent: "#8b5cf6",
  bg: "#0a0a0f",
  preset: "dark",
};

function normalize_hex_color(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed_value = value.trim();
  const short_match = trimmed_value.match(/^#([0-9a-fA-F]{3})$/);
  if (short_match) {
    const [r, g, b] = short_match[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const long_match = trimmed_value.match(/^#([0-9a-fA-F]{6})$/);
  if (long_match) {
    return `#${long_match[1].toLowerCase()}`;
  }
  return null;
}

function normalize_theme_preset(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized_value = value.trim().toLowerCase();
  const allowed_presets = new Set([
    "dark",
    "ocean",
    "forest",
    "sunset",
    "cyberpunk",
    "rose",
    "monochrome",
    "neon",
    "custom",
  ]);
  return allowed_presets.has(normalized_value) ? normalized_value : null;
}

function parse_theme_config(raw_value) {
  let parsed_value = raw_value;

  if (typeof raw_value === "string" && raw_value.trim()) {
    try {
      parsed_value = JSON.parse(raw_value);
    } catch {
      parsed_value = null;
    }
  }

  if (!parsed_value || typeof parsed_value !== "object") {
    return { ...default_theme_config };
  }

  const primary = normalize_hex_color(parsed_value.primary);
  const accent = normalize_hex_color(parsed_value.accent);
  const bg = normalize_hex_color(parsed_value.bg);
  const preset = normalize_theme_preset(parsed_value.preset);

  return {
    primary: primary ?? default_theme_config.primary,
    accent: accent ?? default_theme_config.accent,
    bg: bg ?? default_theme_config.bg,
    preset: preset ?? default_theme_config.preset,
  };
}

function map_user_row(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    theme_config: parse_theme_config(row.theme_config),
  };
}

export function get_default_theme_config() {
  return { ...default_theme_config };
}

export async function getUserById(id) {
  const result = await pg_query(
    `
      SELECT id, username, email, avatar_url, is_premium, country_code, theme_config
      FROM users
      WHERE id::text = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [id],
  );

  return map_user_row(result.rows[0] ?? null);
}

export async function getUserThemeById(id) {
  const result = await pg_query(
    `
      SELECT theme_config
      FROM users
      WHERE id::text = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  return parse_theme_config(row.theme_config);
}

export async function updateUserThemeById(id, theme_config) {
  const normalized_theme_config = parse_theme_config(theme_config);

  const result = await pg_query(
    `
      UPDATE users
      SET theme_config = $2::jsonb
      WHERE id::text = $1 AND is_active = TRUE
    `,
    [id, JSON.stringify(normalized_theme_config)],
  );

  if (!result.rowCount) {
    return null;
  }

  return normalized_theme_config;
}