import type { CSSProperties } from "react";

export type theme_preset =
  | "dark"
  | "ocean"
  | "forest"
  | "sunset"
  | "cyberpunk"
  | "rose"
  | "monochrome"
  | "neon"
  | "custom";

export type theme_config = {
  primary: string;
  accent: string;
  bg: string;
  preset: theme_preset;
};

export const theme_presets: Record<Exclude<theme_preset, "custom">, theme_config> = {
  dark: {
    primary: "#6366f1",
    accent: "#8b5cf6",
    bg: "#0a0a0f",
    preset: "dark",
  },
  ocean: {
    primary: "#0ea5e9",
    accent: "#14b8a6",
    bg: "#041823",
    preset: "ocean",
  },
  forest: {
    primary: "#16a34a",
    accent: "#22c55e",
    bg: "#07180f",
    preset: "forest",
  },
  sunset: {
    primary: "#f97316",
    accent: "#ef4444",
    bg: "#1f0f10",
    preset: "sunset",
  },
  cyberpunk: {
    primary: "#ec4899",
    accent: "#22d3ee",
    bg: "#120a1a",
    preset: "cyberpunk",
  },
  rose: {
    primary: "#f43f5e",
    accent: "#fb7185",
    bg: "#220f18",
    preset: "rose",
  },
  monochrome: {
    primary: "#a1a1aa",
    accent: "#f4f4f5",
    bg: "#090909",
    preset: "monochrome",
  },
  neon: {
    primary: "#84cc16",
    accent: "#22c55e",
    bg: "#05140b",
    preset: "neon",
  },
};

export const default_theme_config: theme_config = theme_presets.dark;

function normalize_hex_color(value: unknown, fallback_value: string): string {
  if (typeof value !== "string") {
    return fallback_value;
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
  return fallback_value;
}

function normalize_preset(value: unknown): theme_preset {
  if (typeof value !== "string") {
    return default_theme_config.preset;
  }
  const normalized_value = value.trim().toLowerCase();
  const allowed_values = new Set<theme_preset>([
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
  return allowed_values.has(normalized_value as theme_preset)
    ? (normalized_value as theme_preset)
    : default_theme_config.preset;
}

export function normalize_theme_config(value: unknown): theme_config {
  const source =
    value && typeof value === "object"
      ? (value as Partial<theme_config>)
      : default_theme_config;

  return {
    primary: normalize_hex_color(source.primary, default_theme_config.primary),
    accent: normalize_hex_color(source.accent, default_theme_config.accent),
    bg: normalize_hex_color(source.bg, default_theme_config.bg),
    preset: normalize_preset(source.preset),
  };
}

export function get_preset_theme_config(preset_key: Exclude<theme_preset, "custom">) {
  return { ...theme_presets[preset_key] };
}

export function build_theme_style(theme: theme_config): CSSProperties {
  return {
    "--color-primary": theme.primary,
    "--color-accent": theme.accent,
    "--color-bg": theme.bg,
  } as CSSProperties;
}
