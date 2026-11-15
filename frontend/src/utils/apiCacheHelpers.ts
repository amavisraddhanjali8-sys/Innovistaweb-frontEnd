export const DEFAULT_GET_CACHE_TTL_MS = 5000;

const NON_CACHEABLE_URL_PREFIXES = [
  "/auth/",
  "/customer/profile",
  "/Notification/",
  "/api/health",
];

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${k}:${stableSerialize(obj[k])}`).join(",")}}`;
}

export function buildApiCacheKey(
  url?: string,
  params?: unknown
): string {
  const cleanUrl = (url || "").trim();
  const serializedParams = stableSerialize(params);
  return serializedParams ? `${cleanUrl}?${serializedParams}` : cleanUrl;
}

export function isMutationMethod(method?: string): boolean {
  const upper = (method || "GET").trim().toUpperCase();
  return (
    upper === "POST" ||
    upper === "PUT" ||
    upper === "PATCH" ||
    upper === "DELETE"
  );
}

export function isCacheableGetRequest(
  method?: string,
  url?: string,
  headers?: Record<string, unknown>
): boolean {
  const upper = (method || "GET").trim().toUpperCase();
  if (upper !== "GET") return false;
  if (headers) {
    const noCache =
      headers["x-no-cache"] ??
      headers["X-No-Cache"] ??
      headers["cache-control"] ??
      headers["Cache-Control"];
    if (noCache === "true" || noCache === "no-cache" || noCache === "no-store") {
      return false;
    }
  }
  const cleanUrl = (url || "").trim();
  if (!cleanUrl) return false;
  return !NON_CACHEABLE_URL_PREFIXES.some((prefix) =>
    cleanUrl.startsWith(prefix)
  );
}

export interface ApiCacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

export function getFreshCacheEntry<T>(
  cache: Map<string, ApiCacheEntry<T>>,
  key: string,
  nowMs: number = Date.now()
): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= nowMs) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

export function setCacheEntry<T>(
  cache: Map<string, ApiCacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number = DEFAULT_GET_CACHE_TTL_MS,
  nowMs: number = Date.now(),
  maxEntries: number = 120
): void {
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, {
    value,
    expiresAt: nowMs + Math.max(0, ttlMs),
  });
}
