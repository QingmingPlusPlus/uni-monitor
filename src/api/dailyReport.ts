import http from './http'
import type { ApiResponse } from './http'

/** 日报专用契约；后端待实现，不代表现有 schedule 接口已具备这些字段。 */
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
  periodStart: string
  periodEnd: string
  updatedAt: string
  status: MetricStatus
  notes: string[]
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
  startAt: string
  endAt: string
  status: 'not_started' | 'in_progress' | 'complete'
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

export type AttendanceReport = ReportData<ReportAttendanceRow>
export type ProductionReport = ReportData<ReportProductionRow>
export type LineLossReport = ReportData<ReportLineRow>
export type QualityReport = ReportData<ReportQualityRow>

function getReport<T>(path: string, params: DailyReportQuery, signal?: AbortSignal) {
  return http.get<ApiResponse<T>>(`/daily-report/${path}`, { params, signal, timeout: 15000 })
}
export const getDailyAttendance = (params: DailyReportQuery, signal?: AbortSignal) =>
  getReport<AttendanceReport>('attendance', params, signal)
export const getDailyProduction = (params: DailyReportQuery, signal?: AbortSignal) =>
  getReport<ProductionReport>('production', params, signal)
export const getDailyLineLosses = (params: DailyReportQuery, signal?: AbortSignal) =>
  getReport<LineLossReport>('line-losses', params, signal)
export const getDailyQuality = (params: DailyReportQuery, signal?: AbortSignal) =>
  getReport<QualityReport>('quality', params, signal)
