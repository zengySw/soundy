import {
  getUserById,
  getUserThemeById,
  updateUserThemeById,
  get_default_theme_config,
} from "../service/users.service.js";

function isUuid(value) {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function getUserProfile(req, res) {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

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

function resolve_theme_payload(body) {
  if (body?.theme_config && typeof body.theme_config === "object") {
    return body.theme_config;
  }
  if (body && typeof body === "object") {
    return body;
  }
  return {};
}

export async function patchMyTheme(req, res) {
  try {
    const user_id = req.user?.userId;
    if (!isUuid(user_id)) {
      return res.status(401).json({ message: "No session" });
    }

    const current_theme_config = await getUserThemeById(user_id);
    if (!current_theme_config) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload = resolve_theme_payload(req.body);
    const patch = {};
    let has_any_update = false;

    if (Object.prototype.hasOwnProperty.call(payload, "primary")) {
      const primary = normalize_hex_color(payload.primary);
      if (!primary) {
        return res.status(400).json({ message: "Invalid primary color" });
      }
      patch.primary = primary;
      has_any_update = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "accent")) {
      const accent = normalize_hex_color(payload.accent);
      if (!accent) {
        return res.status(400).json({ message: "Invalid accent color" });
      }
      patch.accent = accent;
      has_any_update = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "bg")) {
      const bg = normalize_hex_color(payload.bg);
      if (!bg) {
        return res.status(400).json({ message: "Invalid bg color" });
      }
      patch.bg = bg;
      has_any_update = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "preset")) {
      const preset = normalize_theme_preset(payload.preset);
      if (!preset) {
        return res.status(400).json({ message: "Invalid preset" });
      }
      patch.preset = preset;
      has_any_update = true;
    }

    if (!has_any_update) {
      return res.status(400).json({
        message: "Provide at least one of: primary, accent, bg, preset",
      });
    }

    const base_theme_config = current_theme_config ?? get_default_theme_config();
    const next_theme_config = {
      ...base_theme_config,
      ...patch,
    };

    const saved_theme_config = await updateUserThemeById(user_id, next_theme_config);
    if (!saved_theme_config) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user_id,
      theme_config: saved_theme_config,
    });
  } catch (err) {
    console.error("Patch theme error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
