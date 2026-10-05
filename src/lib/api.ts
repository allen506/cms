export function apiUrl(path: string, baseUrl?: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl || baseUrl.trim() === "") {
    return normalizedPath;
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}${normalizedPath}`;
}

export async function fetchJson<T>(path: string, init?: RequestInit, baseUrl?: string): Promise<T> {
  const response = await fetch(apiUrl(path, baseUrl), init);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
