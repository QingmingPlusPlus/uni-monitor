import type { DailyReportQuery, ReportAttendanceRow, ReportLineRow, ReportProductionRow, ReportQualityRow, ReportMetric } from '../../api/dailyReport'
import { absenceColumns, attendanceIssues, metricValue, offsetDate } from './reportModel'

type ObjectValue = Record<string, unknown>
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const timestamp = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
function metric(value: unknown, integer = true): boolean {
  // 缺字段仍可显示 —，但不能参与比率；不接受字符串数量或负数。
  return value === undefined || value === null || (object(value) &&
    ['complete', 'partial', 'unavailable'].includes(String(value.status)) &&
    (value.value === null || (typeof value.value === 'number' && Number.isFinite(value.value) && value.value >= 0 && (!integer || Number.isInteger(value.value)))) &&
    (value.note === undefined || typeof value.note === 'string'))
}
const metrics = (row: ObjectValue, keys: string[]) => keys.every(key => metric(row[key], !key.endsWith('Seconds')))
const named = (value: unknown): value is ObjectValue => object(value) && text(value.id) && text(value.name)
function unique(rows: unknown[], key: string): boolean {
  return rows.every(object) && new Set(rows.map(row => row[key])).size === rows.length
}
function reasons(value: unknown, keys: string[]): boolean {
  return value === null || (Array.isArray(value) && unique(value, 'code') && value.every(row =>
    object(row) && text(row.code) && text(row.name) && metrics(row, keys)))
}
export function validReportMeta(value: unknown, query: DailyReportQuery): boolean {
  if (!object(value) || value.date !== query.date || value.department !== query.department ||
    value.processType !== query.processType || value.reportDate !== offsetDate(query.date, 1) ||
    !['complete', 'partial', 'unavailable'].includes(String(value.status)) || !text(value.timeZone) ||
    ![value.periodStart, value.periodEnd, value.updatedAt].every(timestamp) ||
    Date.parse(String(value.periodEnd)) <= Date.parse(String(value.periodStart)) ||
    !Array.isArray(value.notes) || !value.notes.every(note => typeof note === 'string')) return false
  try { new Intl.DateTimeFormat('zh-CN', { timeZone: value.timeZone }); return true }
  catch { return false }
}
export function validAttendance(rows: ReportAttendanceRow[], query: DailyReportQuery): boolean {
  return unique(rows, 'id') && rows.every(row => object(row) && text(row.id) && text(row.shiftCode) && text(row.shiftName) &&
    typeof row.isEarlyShift === 'boolean' &&
    (row.date === query.date || (row.date === offsetDate(query.date, 1) && row.isEarlyShift)) &&
    ['not_started', 'in_progress', 'complete'].includes(row.status) &&
    timestamp(row.startAt) && timestamp(row.endAt) && Date.parse(row.endAt) > Date.parse(row.startAt) &&
    (row.leaders === null || (Array.isArray(row.leaders) && unique(row.leaders, 'employeeId') &&
      row.leaders.every(leader => object(leader) && text(leader.employeeId) && text(leader.name)))) &&
    metrics(row, ['roster', 'actual', 'absent']) && object(row.absence) &&
    absenceColumns.every(column => metric(row.absence[column.key])))
}
export function validProduction(rows: ReportProductionRow[]): boolean {
  return unique(rows, 'id') && rows.every(row => named(row) &&
    metrics(row, ['plan', 'actual', 'qualified', 'flowing', 'defective', 'scrapped']))
}
export function validLines(rows: ReportLineRow[]): boolean {
  return unique(rows, 'id') && rows.every(row => named(row) &&
    metrics(row, ['plan', 'actual', 'availableSeconds', 'plannedStopSeconds', 'productionSeconds', 'lossSeconds']) &&
    reasons(row.reasons, ['count', 'durationSeconds']))
}
export function validQuality(rows: ReportQualityRow[], query: DailyReportQuery): boolean {
  return unique(rows, 'id') && rows.every(row => named(row) &&
    row.dimension === (query.processType === 'sulfur_addition' ? 'mold' : 'production_number') &&
    Array.isArray(row.lines) && row.lines.every(named) && Array.isArray(row.productionNumbers) && row.productionNumbers.every(text) &&
    metrics(row, ['actual', 'qualified', 'defective']) && reasons(row.reasons, ['count']) &&
    (row.reasonNote === undefined || typeof row.reasonNote === 'string'))
}

/** 不能把缺字段或尚未完成的班次包装成“数据完整”。 */
export function hasIncompleteRows(rows: unknown[]): boolean {
  return rows.some(value => {
    if (!object(value)) return true
    const required = 'shiftCode' in value ? ['roster', 'actual', 'absent']
      : 'dimension' in value ? ['actual', 'qualified', 'defective']
      : 'reasons' in value ? ['plan', 'actual', 'availableSeconds', 'plannedStopSeconds', 'productionSeconds', 'lossSeconds']
      : ['plan', 'actual', 'qualified', 'flowing', 'defective', 'scrapped']
    if (required.some(key => metricValue(value[key] as ReportMetric | undefined, true) === null)) return true
    if ('shiftCode' in value) {
      const row = value as unknown as ReportAttendanceRow
      if (row.status !== 'complete' || row.leaders === null || attendanceIssues(row).length > 0) return true
      if (absenceColumns.some(column => metricValue(row.absence[column.key], true) === null)) return true
    }
    if ('reasons' in value) {
      if (value.reasons === null) return true
      if (Array.isArray(value.reasons) && value.reasons.some(reason => object(reason) &&
        (metricValue(reason.count as ReportMetric | undefined, true) === null || (!('dimension' in value) && metricValue(reason.durationSeconds as ReportMetric | undefined, true) === null)))) return true
    }
    return false
  })
}
