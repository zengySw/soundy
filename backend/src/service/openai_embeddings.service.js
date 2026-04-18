import { config } from "../config/env.js";

function compact_text(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function build_embedding_input({ title, artist, genre }) {
  const safe_title = compact_text(title || "unknown title");
  const safe_artist = compact_text(artist || "unknown artist");
  const safe_genre = compact_text(genre || "unknown genre");

  return `title: ${safe_title}\nartist: ${safe_artist}\ngenre: ${safe_genre}`;
}

export function embedding_to_pgvector(embedding_values) {
  if (!Array.isArray(embedding_values) || embedding_values.length === 0) {
    throw new Error("EMBEDDING_INVALID");
  }
  return `[${embedding_values.join(",")}]`;
}

export async function generate_track_embedding({ title, artist, genre }) {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const input = build_embedding_input({ title, artist, genre });
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.OPENAI_EMBEDDING_MODEL,
      input,
    }),
  });

  if (!response.ok) {
    const error_payload = await response.text().catch(() => "");
    throw new Error(
      `OPENAI_EMBEDDING_REQUEST_FAILED: ${response.status} ${error_payload}`,
    );
  }

  const payload = await response.json();
  const embedding_values = payload?.data?.[0]?.embedding;
  if (!Array.isArray(embedding_values) || embedding_values.length === 0) {
    throw new Error("OPENAI_EMBEDDING_EMPTY");
  }

  return embedding_values;
}
