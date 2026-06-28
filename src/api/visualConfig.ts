import http from './http'
import type { ApiRecord, ApiResponse } from './http'

export type VisualConfigMap = Record<string, unknown>

export type VisualConfigSaveResponse = ApiResponse<boolean>
export type VisualConfigValueResponse = ApiResponse<string | null>

export function saveVisualConfigMap(data: VisualConfigMap) {
  return http.post<VisualConfigSaveResponse>('/visual/saveMap', data)
}

export function getVisualConfigValue(key: string) {
  return http.get<VisualConfigValueResponse>('/visual/getValue', {
    params: { key },
  })
}

export function parseVisualConfigValue<T extends ApiRecord | unknown[] | string | number | boolean>(
  value: string | null,
) {
  if (value === null || value === '') return null

  try {
    return JSON.parse(value) as T
  } catch {
    return value as T
  }
}
