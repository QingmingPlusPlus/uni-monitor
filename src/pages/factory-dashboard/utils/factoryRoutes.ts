import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../components/css-map/css3dMapTypes'

export type FactoryRouteSource = 'department' | 'process'

export function buildDepartmentUrl(departmentId: CssMapDepartmentValue): string {
  return `/pages/department/index?departmentId=${encodeURIComponent(departmentId)}`
}

export function buildProcessUrl(processId: CssMapProcessValue): string {
  return `/pages/process/index?processId=${encodeURIComponent(processId)}`
}

export function buildEquipmentUrl(deviceId: string, from: FactoryRouteSource): string {
  return `/pages/equipment/index?deviceId=${encodeURIComponent(deviceId)}&from=${from}`
}

function isBrowserRouteRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.location !== 'undefined'
}

function writeBrowserHash(url: string): void {
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  window.location.hash = `#${normalizedUrl}`
}

function parseQueryString(value: string): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {}
  const params = new URLSearchParams(value)
  params.forEach((paramValue, key) => {
    query[key] = paramValue
  })

  return query
}

export function readCurrentFactoryRouteQuery(): Record<string, string | undefined> | undefined {
  if (!isBrowserRouteRuntime()) return undefined

  const queryIndex = window.location.hash.indexOf('?')
  if (queryIndex < 0) return undefined

  return parseQueryString(window.location.hash.slice(queryIndex + 1))
}

export function subscribeFactoryRouteQueryChange(callback: () => void): () => void {
  if (!isBrowserRouteRuntime()) return () => {}

  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function redirectToFactoryUrl(url: string): void {
  if (isBrowserRouteRuntime()) {
    writeBrowserHash(url)
    return
  }

  uni.redirectTo({ url })
}

export function navigateToFactoryUrl(url: string): void {
  if (isBrowserRouteRuntime()) {
    writeBrowserHash(url)
    return
  }

  uni.navigateTo({ url })
}

export function parseRouteSource(value: string | null | undefined): FactoryRouteSource {
  return value === 'process' ? 'process' : 'department'
}

export function readQueryValue(
  query: Readonly<Record<string, string | undefined>> | undefined,
  key: string,
): string | undefined {
  return query?.[key]
}
