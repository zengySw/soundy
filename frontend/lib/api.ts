const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function apiFetch(path: string, options: RequestInit = {}) {
  const url = path.startsWith("http")
    ? path
    : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  return fetch(url, {
    credentials: options.credentials ?? "include",
    ...options,
  });
}

export { API_URL };
