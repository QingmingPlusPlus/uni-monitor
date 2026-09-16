import http from './http'
import type { ApiResponse } from './http'

export interface DeviceAvailabilityFilter {
  readonly departmentId?: string
  readonly processType?: string
  readonly deviceCode?: string
}

export interface DeviceAvailabilityParams extends DeviceAvailabilityFilter {
  /** yyyy-MM-dd；Swagger 为可选，页面查询时应显式传入。 */
  readonly day?: string
  readonly deviceId?: string
}

export interface DeviceAvailabilityMonthParams extends DeviceAvailabilityFilter {
  readonly month?: string
  readonly deviceId?: string
}

export interface DeviceAvailabilityYearParams extends DeviceAvailabilityFilter {
  readonly year?: string
  readonly deviceId?: string
}

/** 年/月/日共用统计（小时）；未获成功非空样本，字段来自 Swagger。 */
export interface DeviceAvailabilityRecord {
  /** Swagger 为 int64；保留字符串兼容，避免强制转换大整数 ID。 */
  readonly deviceId?: string | number
  readonly deviceName?: string
  readonly departmentId?: string
  readonly departmentName?: string
  readonly processType?: string
  readonly processTypeName?: string
  readonly period?: string
  readonly totalRunHours?: number
  readonly obstructionHours?: number
  readonly deviceCode?: string
}

export interface DevicePauseRecordsParams {
  readonly deviceCode?: string
  readonly queryDate?: string
}

/** Swagger 已确认的暂停记录字段；服务端扩展字段不参与业务判断。 */
export interface DevicePauseRecord {
  readonly id?: string | number
  readonly deviceId?: string | number
  readonly deviceCode?: string
  readonly deviceName?: string
  readonly pauseType?: string
  readonly pauseTypeName?: string
  readonly startTime?: string
  /** 未恢复时允许无结束时间；可空性按防御性兼容处理。 */
  readonly endTime?: string | null
  readonly durationMinutes?: number
  /** 1 暂停中、2 已恢复。 */
  readonly operationStatus?: number
  readonly shiftDate?: string
}

export interface DeviceAvailabilityDailyNetParams extends DeviceAvailabilityFilter {
  readonly month?: string
}

/** Swagger 标记为实绩 MH；生产性按设备查询并将 period 解析为日期，非空响应仍待实测。 */
export interface DeviceAvailabilityDailyNetRecord {
  readonly period: string
  readonly netHours: number
}

export interface DeviceAvailabilityDayReportParams extends DeviceAvailabilityFilter {
  readonly day?: string
}

export interface DeviceObstructionItem {
  readonly pauseType: string
  readonly pauseTypeName: string
  readonly obstructionHours: number
  readonly count: number
  /** Swagger 未声明比例单位，不能擅自乘以 100。 */
  readonly ratio: number
}

/** 日报设备可动率；仅声明，不能直接替代前端 /daily-report/* 契约。 */
export interface DeviceAvailabilityDayReportRecord {
  readonly deviceId: string | number
  readonly deviceCode: string
  readonly deviceName: string
  readonly departmentId: string
  readonly departmentName: string
  readonly processType: string
  readonly processTypeName: string
  readonly day: string
  readonly totalRunHours: number
  readonly productionHours: number
  readonly obstructionHours: number
  /** 单位及分母口径尚待确认。 */
  readonly availabilityRate: number
  readonly obstructionItems: DeviceObstructionItem[]
}

export type DeviceAvailabilityResponse = ApiResponse<DeviceAvailabilityRecord[]>
export type DevicePauseRecordsResponse = ApiResponse<DevicePauseRecord[]>
export type DeviceAvailabilityDailyNetResponse = ApiResponse<DeviceAvailabilityDailyNetRecord[]>
export type DeviceAvailabilityDayReportResponse = ApiResponse<DeviceAvailabilityDayReportRecord[]>

export function getDeviceAvailabilityByDay(params: DeviceAvailabilityParams) {
  return http.get<DeviceAvailabilityResponse>('/device/availability/day', { params })
}

export function getDevicePauseRecords(params: DevicePauseRecordsParams) {
  return http.get<DevicePauseRecordsResponse>('/device/availability/pauseRecords', { params })
}

export function getDeviceAvailabilityByMonth(params: DeviceAvailabilityMonthParams) {
  return http.get<DeviceAvailabilityResponse>('/device/availability/month', { params })
}

export function getDeviceAvailabilityByYear(params: DeviceAvailabilityYearParams) {
  return http.get<DeviceAvailabilityResponse>('/device/availability/year', { params })
}

export function getDeviceAvailabilityDailyNet(params: DeviceAvailabilityDailyNetParams) {
  return http.get<DeviceAvailabilityDailyNetResponse>('/device/availability/month/daily-net', { params, timeout: 15000 })
}

export function getDeviceAvailabilityDayReport(params: DeviceAvailabilityDayReportParams) {
  return http.get<DeviceAvailabilityDayReportResponse>('/device/availability/day/report', { params })
}
