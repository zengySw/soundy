const network_error_codes = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

function normalize_error_text(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function is_database_unavailable_error(error) {
  const direct_code = String(error?.code || "")
    .trim()
    .toUpperCase();
  const cause_code = String(error?.cause?.code || "")
    .trim()
    .toUpperCase();

  if (network_error_codes.has(direct_code) || network_error_codes.has(cause_code)) {
    return true;
  }

  const joined_message = [
    normalize_error_text(error?.message),
    normalize_error_text(error?.cause?.message),
  ]
    .filter(Boolean)
    .join(" ");

  if (!joined_message) {
    return false;
  }

  return (
    joined_message.includes("connection timeout") ||
    joined_message.includes("connection terminated unexpectedly") ||
    joined_message.includes("connect etimedout") ||
    joined_message.includes("failed to connect") ||
    joined_message.includes("could not connect")
  );
}
