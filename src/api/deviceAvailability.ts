import http from './http'
import type { ApiResponse } from './http'

export interface DeviceAvailabilityParams {
  readonly day: string
  readonly departmentId?: string
  readonly processType?: string
  readonly deviceCode?: string
}

/** 单设备当日运行与阻碍时长（单位：小时）。 */
export interface DeviceAvailabilityRecord {
  readonly totalRunHours?: number
  readonly obstructionHours?: number
  readonly deviceCode?: string
}

export interface DevicePauseRecordsParams {
  readonly deviceCode: string
  readonly queryDate?: string
}

/** Swagger 已确认的暂停记录字段；服务端扩展字段不参与业务判断。 */
export interface DevicePauseRecord {
  readonly pauseReason?: string
  readonly reason?: string
  readonly startTime?: string
  readonly pauseStartTime?: string
  readonly endTime?: string
  readonly pauseEndTime?: string
  readonly durationMinutes?: number
  readonly minutes?: number
  readonly status?: string
  readonly shiftDate?: string
}

export type DeviceAvailabilityResponse = ApiResponse<DeviceAvailabilityRecord[]>
export type DevicePauseRecordsResponse = ApiResponse<DevicePauseRecord[]>

export function getDeviceAvailabilityByDay(params: DeviceAvailabilityParams) {
  return http.get<DeviceAvailabilityResponse>('/device/availability/day', { params })
}

export function getDevicePauseRecords(params: DevicePauseRecordsParams) {
  return http.get<DevicePauseRecordsResponse>('/device/availability/pauseRecords', { params })
}
