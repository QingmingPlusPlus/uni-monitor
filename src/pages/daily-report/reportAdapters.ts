import type { ApiRecord } from '../../api/http'
import type { DailyReportQuery, ReportMeta, ReportMetric, ReportProductionRow, ReportQualityRow, ReportLineRow, ReportLossReason } from '../../api/dailyReport'
import type { ReportSource } from './reportSources'
import { isReportDate, offsetDate, processLabels, metricValue } from './reportModel'

export const missingMetric = (note = '当前数据源未提供此项'): ReportMetric => ({ value: null, status: 'unavailable', note })
export function sourceMetric(value: unknown, integer = true, multiplier = 1): ReportMetric {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value)) || !Number.isFinite(value * multiplier)) return missingMetric('字段缺失或数值无效')
  return { value: value * multiplier, status: 'complete' }
}
export function sourceMeta(query: DailyReportQuery, notes: string[]): ReportMeta {
  return { ...query, reportDate: offsetDate(query.date, 1), timeZone: 'Asia/Shanghai',
    periodStart: null, periodEnd: null, updatedAt: new Date().toISOString(), timestampSource: 'retrieved',
    status: 'partial', notes: [...new Set(notes.filter(Boolean))] }
}
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '' }
export function deviceCode(value: unknown): string { return text(value).toUpperCase() }
function dateOf(record: ApiRecord): string {
  const value = text(record.date ?? record.workDate).slice(0, 10)
  return isReportDate(value) ? value : ''
}
function processOf(value: unknown): string {
  const name = text(value)
  // 日报按工序族合计；检查/包装归后处理由业务确认。
  return ({ 前处理: 'preprocessing', 前处理1: 'preprocessing', 前处理2: 'preprocessing', 加硫: 'sulfur_addition',
    后处理: 'post_processing', 仕上检查: 'post_processing', 出货检查包装: 'post_processing' } as Record<string, string>)[name] ?? name
}
function scopeOf(record: ApiRecord): string {
  const department = text(record.dept)
  const process = processOf(record.process)
  return department && process in processLabels ? `${department}:${process}` : ''
}
function sum(records: ApiRecord[], source: ReportSource, field = 'number'): ReportMetric {
  if (source.records === null) return missingMetric(source.note)
  if (!records.length) return missingMetric('该范围未返回记录，不视为零')
  const values = records.map(record => sourceMetric(record[field]))
  if (values.some(value => value.value === null)) return missingMetric('部分记录数值缺失，未合计不完整数据')
  const metric = sourceMetric(values.reduce((total, item) => total + item.value!, 0))
  if (source.incompleteScope && metric.value !== null) {
    metric.status = 'partial'
    metric.note = '存在工序归属未确认的记录，仅合计已确认部分，不参与排行'
  }
  return metric
}

export interface ScheduleContext {
  plans: ApiRecord[]
  actuals: ApiRecord[]
  rejects: ApiRecord[]
  planSource: ReportSource
  actualSource: ReportSource
  rejectSource: ReportSource
  notes: string[]
  incompleteRejectScope: boolean
}

/** 日报按全部月记录的部门和工序过滤，不读取地图显示白名单或实时设备归属。 */
export function scheduleContext(query: DailyReportQuery, sources: ReportSource[]): ScheduleContext {
  const [rawPlans, rawActuals, rejectSource] = sources
  const key = `${query.department}:${query.processType}`
  const inScope = (record: ApiRecord) => dateOf(record) === query.date && scopeOf(record) === key
  const unknownProcesses = new Set<string>()
  const scopedSource = (source: ReportSource): ReportSource => {
    const unknown = (source.records ?? []).filter(record => dateOf(record) === query.date &&
      (!text(record.dept) || text(record.dept) === query.department) && !scopeOf(record))
    for (const record of unknown) unknownProcesses.add(text(record.process) || '未标明工序')
    return { ...source, incompleteScope: unknown.length > 0 }
  }
  const planSource = scopedSource(rawPlans)
  const actualSource = scopedSource(rawActuals)
  const registry = new Map<string, Set<string>>()
  for (const record of [...(planSource.records ?? []), ...(actualSource.records ?? [])]) {
    if (!dateOf(record).startsWith(query.date.slice(0, 7))) continue
    const code = deviceCode(record.shebei)
    const scope = scopeOf(record)
    if (!code) continue
    const scopes = registry.get(code) ?? new Set<string>()
    scopes.add(scope)
    registry.set(code, scopes)
  }
  let incompleteRejectScope = false
  const rejects = (rejectSource.records ?? []).filter(record => {
    if (dateOf(record) !== query.date) return false
    const explicit = scopeOf(record)
    if (explicit) return explicit === key
    const scopes = registry.get(deviceCode(record.shebei))
    if (!scopes || scopes.size !== 1 || scopes.has('')) { incompleteRejectScope = true; return false }
    // 不用设备关联覆盖记录自身提供的部门或工序。
    if ((text(record.dept) && text(record.dept) !== query.department) ||
      (text(record.process) && processOf(record.process) !== query.processType)) return false
    return scopes.has(key)
  })
  const notes = sources.map(source => source.note).filter(Boolean)
  if (unknownProcesses.size) notes.push(`以下记录的部门或工序归属尚未确认，未计入合计：${[...unknownProcesses].sort().join('、')}。已确认数量仍可查看，但不参与排行。`)
  if (incompleteRejectScope) notes.push('部分不良记录无法确认部门与工序归属，已排除；不良合计仅供核对，不参与排行。')
  return { plans: (planSource.records ?? []).filter(inScope), actuals: (actualSource.records ?? []).filter(inScope),
    rejects, planSource, actualSource, rejectSource, notes, incompleteRejectScope }
}

export function rejectMetrics(records: ApiRecord[], context: ScheduleContext) {
  const kinds = records.map(record => text(record.type))
  if (!records.length || kinds.some(kind => !['不良', '其它', '其他'].includes(kind))) {
    const missing = missingMetric(context.rejectSource.note || '不良分类没有记录或未明确，不能推断为零')
    return { defective: missing, scrapped: missing }
  }
  const defects = records.filter(record => text(record.type) === '不良')
  const defective = sum(defects, context.rejectSource)
  const scrapped = sum(records, context.rejectSource)
  if (context.incompleteRejectScope) {
    if (defective.value !== null) defective.status = 'partial'
    if (scrapped.value !== null) scrapped.status = 'partial'
  }
  return { defective, scrapped }
}

export function productionRows(query: DailyReportQuery, context: ScheduleContext): ReportProductionRow[] {
  if (![context.plans, context.actuals, context.rejects].some(rows => rows.length)) return []
  return [{ id: query.processType, name: `${processLabels[query.processType]}合计`,
    plan: sum(context.plans, context.planSource), actual: sum(context.actuals, context.actualSource),
    qualified: missingMetric('未提供权威合格数'), flowing: missingMetric('未提供流动数'), ...rejectMetrics(context.rejects, context) }]
}

export function qualityRows(context: ScheduleContext): ReportQualityRow[] {
  const numbers = new Set([...context.actuals, ...context.rejects].map(record => text(record.zhifan)).filter(Boolean))
  return [...numbers].sort().map(number => {
    const actuals = context.actuals.filter(record => text(record.zhifan) === number)
    const rejects = context.rejects.filter(record => text(record.zhifan) === number)
    const codes = new Set([...actuals, ...rejects].map(record => deviceCode(record.shebei)).filter(Boolean))
    return { id: number, name: number, dimension: 'production_number', productionNumbers: [number],
      lines: [...codes].sort().map(code => ({ id: code, name: code })), actual: sum(actuals, context.actualSource),
      qualified: missingMetric('未提供权威合格数'), defective: rejectMetrics(rejects, context).defective,
      reasons: null, reasonNote: '当前数据没有不良现象和模具关联；按制番展示，不换算为模具排行。' }
  })
}

function obstructionReasons(value: unknown): ReportLossReason[] | null {
  if (!Array.isArray(value)) return null
  const rows = new Map<string, ReportLossReason>()
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return null
    const record = raw as ApiRecord
    const code = text(record.pauseType)
    const name = text(record.pauseTypeName)
    if (!code || !name || rows.has(code)) return null
    rows.set(code, { code, name, count: sourceMetric(record.count),
      durationSeconds: sourceMetric(record.obstructionHours, false, 3600), reportedRatio: sourceMetric(record.ratio, false) })
  }
  return [...rows.values()].sort((a, b) => (metricValue(b.durationSeconds) ?? -1) - (metricValue(a.durationSeconds) ?? -1) || a.code.localeCompare(b.code))
}

export function lineRows(query: DailyReportQuery, context: ScheduleContext, devices: ReportSource): ReportLineRow[] {
  const deviceRecords = new Map<string, ApiRecord | null>()
  for (const record of devices.records ?? []) {
    if (record.day !== query.date || text(record.departmentId) !== query.department || processOf(record.processType) !== query.processType) continue
    const code = deviceCode(record.deviceCode)
    if (code) deviceRecords.set(code, deviceRecords.has(code) ? null : record)
  }
  const codes = new Set([...context.plans, ...context.actuals].map(record => deviceCode(record.shebei)).filter(Boolean))
  for (const code of deviceRecords.keys()) codes.add(code)
  return [...codes].sort().map(code => {
    const record = deviceRecords.get(code)
    return { id: code, name: text(record?.deviceName) || code,
      plan: sum(context.plans.filter(row => deviceCode(row.shebei) === code), context.planSource),
      actual: sum(context.actuals.filter(row => deviceCode(row.shebei) === code), context.actualSource),
      availableSeconds: missingMetric('未明确已扣除计划停止的可运转时间'), plannedStopSeconds: missingMetric('未提供计划停止时间'),
      totalRunSeconds: sourceMetric(record?.totalRunHours, false, 3600),
      productionSeconds: sourceMetric(record?.productionHours, false, 3600), lossSeconds: sourceMetric(record?.obstructionHours, false, 3600),
      reportedAvailabilityRate: sourceMetric(record?.availabilityRate, false), reasons: obstructionReasons(record?.obstructionItems) }
  })
}
