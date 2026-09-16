import http from './http'
import type { ApiResponse } from './http'
import type { ApiRecord } from './http'
import type { TwoDayAttendancePerformanceParams, TwoDayAttendancePerformanceResponse } from './attendance'
import type { DeviceAvailabilityDayReportParams, DeviceAvailabilityDayReportResponse } from './deviceAvailability'

/** 日报展示模型，由页面适配已发布接口；不代表服务端存在 /daily-report/*。 */
export type ReportProcessType = 'preprocessing' | 'sulfur_addition' | 'post_processing'
export interface DailyReportQuery {
  date: string
  department: string
  processType: ReportProcessType
}

export type MetricStatus = 'complete' | 'partial' | 'unavailable'
export interface ReportMetric {
  value: number | null
  status: MetricStatus
  note?: string
}

export interface ReportMeta extends DailyReportQuery {
  reportDate: string
  timeZone: string
  periodStart: string | null
  periodEnd: string | null
  updatedAt: string
  status: MetricStatus
  notes: string[]
  /** 后端未提供更新时间时，明确展示为本次读取时间。 */
  timestampSource?: 'source' | 'retrieved'
  lineDimension?: 'line' | 'device'
  qualityDimension?: 'production_number' | 'mold'
}

export interface ReportData<Row> {
  meta: ReportMeta
  rows: Row[]
}

export type AbsenceReason = 'annual' | 'care' | 'sick' | 'personal' | 'other' | 'unexcused'
export interface ReportAttendanceRow {
  id: string
  date: string
  shiftCode: string
  shiftName: string
  /** 由后端确定报告日早班，前端不解析班次名称。 */
  isEarlyShift: boolean
  startAt: string | null
  endAt: string | null
  status: 'not_started' | 'in_progress' | 'complete' | 'reported'
  /** twoDayAttendancePerformance 的权威出勤率，单位 %。 */
  reportedAttendanceRate?: ReportMetric
  /** null 表示未接入，[] 表示已核实没有出勤班长。 */
  leaders: { employeeId: string; name: string }[] | null
  roster: ReportMetric
  actual: ReportMetric
  absent: ReportMetric
  absence: Record<AbsenceReason, ReportMetric>
}

export interface ReportProductionRow {
  id: string
  name: string
  plan: ReportMetric
  actual: ReportMetric
  qualified: ReportMetric
  flowing: ReportMetric
  defective: ReportMetric
  scrapped: ReportMetric
}

export interface ReportLossReason {
  code: string
  name: string
  count: ReportMetric
  durationSeconds: ReportMetric
  reportedRatio?: ReportMetric
}
export interface ReportLineRow {
  id: string
  name: string
  plan: ReportMetric
  actual: ReportMetric
  availableSeconds: ReportMetric
  plannedStopSeconds: ReportMetric
  productionSeconds: ReportMetric
  lossSeconds: ReportMetric
  totalRunSeconds?: ReportMetric
  /** 原始值，单位尚未声明时不换算为百分比。 */
  reportedAvailabilityRate?: ReportMetric
  /** null 为未接入，空数组为没有阻碍事件。 */
  reasons: ReportLossReason[] | null
}

export interface ReportQualityRow {
  id: string
  name: string
  dimension: 'production_number' | 'mold'
  lines: { id: string; name: string }[]
  productionNumbers: string[]
  actual: ReportMetric
  qualified: ReportMetric
  defective: ReportMetric
  reasons: { code: string; name: string; count: ReportMetric }[] | null
  reasonNote?: string
}

export type AttendanceReport = ReportData<ReportAttendanceRow> & { monitorNames?: string[] }
export type ProductionReport = ReportData<ReportProductionRow>
export type LineLossReport = ReportData<ReportLineRow>
export type QualityReport = ReportData<ReportQualityRow>

export function getReportAttendanceSource(params: TwoDayAttendancePerformanceParams, signal?: AbortSignal) {
  return http.get<TwoDayAttendancePerformanceResponse>('/attendance/twoDayAttendancePerformance', { params, signal, timeout: 15000 })
}

export function getReportDeviceSource(params: DeviceAvailabilityDayReportParams, signal?: AbortSignal) {
  return http.get<DeviceAvailabilityDayReportResponse>('/device/availability/day/report', { params, signal, timeout: 15000 })
}

/** 开放 Map 响应在日报适配层验证，不将示例字段强制当成运行时契约。 */
export function getReportPlanSource(month: string, signal?: AbortSignal) {
  return http.get<ApiResponse<ApiRecord[]>>('/schedule/getPlan', { params: { month }, signal, timeout: 15000 })
}
export function getReportOutputSource(month: string, signal?: AbortSignal) {
  return http.get<ApiResponse<ApiRecord[]>>('/schedule/getOutput', { params: { month }, signal, timeout: 15000 })
}
export function getReportRejectsSource(month: string, signal?: AbortSignal) {
  return http.get<ApiResponse<ApiRecord[]>>('/schedule/getRejects', { params: { month }, signal, timeout: 15000 })
}
