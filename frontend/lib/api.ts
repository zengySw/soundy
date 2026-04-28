const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function normalize_api_path(path: string) {
  const raw_path = String(path || "").trim();
  if (!raw_path) {
    return "/api";
  }
  if (raw_path.startsWith("http://") || raw_path.startsWith("https://")) {
    return raw_path;
  }

  const normalized_path = raw_path.startsWith("/") ? raw_path : `/${raw_path}`;
  if (normalized_path === "/api" || normalized_path.startsWith("/api/")) {
    return normalized_path;
  }

  return `/api${normalized_path}`;
}

export function apiFetch(path: string, options: RequestInit = {}) {
  const normalized_path = normalize_api_path(path);
  const url = normalized_path.startsWith("http")
    ? normalized_path
    : `${API_URL}${normalized_path}`;

  return fetch(url, {
    credentials: options.credentials ?? "include",
    ...options,
  });
}

export { API_URL };
