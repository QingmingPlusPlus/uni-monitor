import type {
  AbsenceReason, ReportAttendanceRow, ReportLineRow, ReportMetric, ReportProcessType, ReportQualityRow,
} from '../../api/dailyReport'
import type { CssMapDepartmentValue, CssMapSelectionConfig } from '../../components/css-map/css3dMapTypes'
import { toApiProcessType } from '../factory-dashboard/data/loaders/cssMapValueMapping'

export const processLabels: Record<ReportProcessType, string> = {
  preprocessing: '前处理', sulfur_addition: '加硫', post_processing: '后处理',
}
export const absenceColumns: { key: AbsenceReason; label: string }[] = [
  { key: 'annual', label: '年假' }, { key: 'care', label: '陪护' },
  { key: 'sick', label: '病假' }, { key: 'personal', label: '事假' },
  { key: 'other', label: '其他' }, { key: 'unexcused', label: '旷工' },
]

export function processOptions(department: CssMapDepartmentValue, config: CssMapSelectionConfig) {
  return [...new Set(config.departmentProcessMap[department].map(toApiProcessType))]
    .filter((value): value is ReportProcessType => value in processLabels)
    .map(value => ({ value, label: processLabels[value] }))
}

export function isReportDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function offsetDate(value: string, offset: number): string {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
export function yesterday(now = new Date()): string {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return offsetDate(today, -1)
}
export function weekday(value: string): string {
  return '日一二三四五六'[new Date(`${value}T12:00:00Z`).getUTCDay()]
}

export function metricValue(metric: ReportMetric | null | undefined, requireComplete = false): number | null {
  if (!metric || metric.status === 'unavailable' || (requireComplete && metric.status !== 'complete')) return null
  return typeof metric.value === 'number' && Number.isFinite(metric.value) && metric.value >= 0 ? metric.value : null
}
export function formatMetric(metric: ReportMetric | null | undefined, hours = false): string {
  const value = metricValue(metric)
  if (value === null) return '—'
  return hours ? (value / 3600).toFixed(2) : value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}
export function ratio(numerator: ReportMetric | null | undefined, denominator: ReportMetric | null | undefined): number | null {
  const n = metricValue(numerator, true)
  const d = metricValue(denominator, true)
  return n !== null && d !== null && d > 0 ? n / d : null
}
export function percent(numerator: ReportMetric | null | undefined, denominator: ReportMetric | null | undefined, digits = 2): string {
  const value = ratio(numerator, denominator)
  return value === null ? '—' : `${(value * 100).toFixed(digits)}%`
}
export function attendanceRate(row: ReportAttendanceRow): string {
  return row.status === 'complete' ? percent(row.actual, row.roster, 1) : '—'
}
export function attendanceIssues(row: ReportAttendanceRow): string[] {
  if (row.status !== 'complete') return []
  const roster = metricValue(row.roster, true)
  const actual = metricValue(row.actual, true)
  const absent = metricValue(absenceTotal(row), true)
  const counts = absenceColumns.map(column => metricValue(row.absence[column.key], true))
  const issues: string[] = []
  if (roster !== null && actual !== null && actual > roster) issues.push('出勤人数超过排班人数，请核对统计口径')
  if (absent !== null && counts.every(value => value !== null) && counts.reduce<number>((sum, value) => sum + value!, 0) !== absent) issues.push('缺勤分类合计与缺勤总数不一致，请核对')
  return issues
}

export function formatReportTimestamp(value: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
  } catch { return value }
}
export function absenceTotal(row: ReportAttendanceRow): ReportMetric | undefined {
  if (row.status !== 'complete') return undefined
  if (metricValue(row.absent) !== null) return row.absent
  const roster = metricValue(row.roster, true)
  const actual = metricValue(row.actual, true)
  return roster !== null && actual !== null && roster >= actual
    ? { value: roster - actual, status: 'complete' } : row.absent
}
export function attendanceRows(rows: ReportAttendanceRow[], date: string): ReportAttendanceRow[] {
  return rows.filter(row => row.date === date || (row.date === offsetDate(date, 1) && row.isEarlyShift))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id))
}
export function rankLines(rows: ReportLineRow[]): ReportLineRow[] {
  return rows.filter(row => { const value = ratio(row.actual, row.plan); return value !== null && value < 0.9 })
    .sort((a, b) => ratio(a.actual, a.plan)! - ratio(b.actual, b.plan)! || a.id.localeCompare(b.id))
    .slice(0, 3)
}
export function rankQuality(rows: ReportQualityRow[], process: ReportProcessType): ReportQualityRow[] {
  const dimension = process === 'sulfur_addition' ? 'mold' : 'production_number'
  return rows.filter(row => row.dimension === dimension && (ratio(row.defective, row.actual) ?? 0) > 0)
    .sort((a, b) => ratio(b.defective, b.actual)! - ratio(a.defective, a.actual)! || a.id.localeCompare(b.id))
    .slice(0, 3)
}
