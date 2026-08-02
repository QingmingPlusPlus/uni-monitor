const CACHE_TTL_MS = 60_000

export interface CacheEntry<T> {
  readonly data: T
  readonly timestamp: number
}

export function buildCacheKey(prefix: string, key: string, version: number): string {
  return `${prefix}${key}:v${version}`
}

export function isCacheEntry<T>(
  value: unknown,
  isData: (value: unknown) => value is T,
): value is CacheEntry<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CacheEntry<T>).timestamp === 'number' &&
    isData((value as CacheEntry<T>).data)
  )
}

export function readCache<T>(
  key: string,
  isData: (value: unknown) => value is T,
  label: string,
): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCacheEntry(parsed, isData)) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
    return parsed.data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[${label}] 缓存读取失败: ${error.message}`)
    }
    return null
  }
}

export function writeCache<T>(key: string, data: T, label: string): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    window.sessionStorage.setItem(key, JSON.stringify(entry))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[${label}] 缓存写入失败: ${error.message}`)
    }
  }
}

export function invalidateCache(
  prefix: string,
  key: string,
  version: number,
  label: string,
  inflight: { key: string; promise: unknown | null },
): void {
  try {
    window.sessionStorage.removeItem(buildCacheKey(prefix, key, version))
    window.sessionStorage.removeItem(buildCacheKey(prefix, key, 0))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[${label}] 缓存清理失败: ${error.message}`)
    }
  }

  const target = buildCacheKey(prefix, key, version)
  if (inflight.key === target || inflight.key === buildCacheKey(prefix, key, 0)) {
    inflight.key = ''
    inflight.promise = null
  }
}
