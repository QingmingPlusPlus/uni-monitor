import type { ApiRecord } from '../../api/http'
import type { DailyReportQuery, ReportMeta, ReportMetric, ReportProductionRow, ReportQualityRow, ReportLineRow, ReportLossReason } from '../../api/dailyReport'
import type { ReportSource } from './reportSources'
import { isReportDate, offsetDate, processLabels, metricValue } from './reportModel'

export const missingMetric = (note = '当前数据源未提供此项'): ReportMetric => ({ value: null, status: 'unavailable', note })
export function sourceMetric(value: unknown, integer = true, multiplier = 1): ReportMetric {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value)) || !Number.isFinite(value * multiplier)) return missingMetric('字段缺失或数值无效')
  return { value: value * multiplier, status: 'complete' }
}
/** schedule 的 Swagger 示例明确允许十进制数量字符串；不扩散到人数、设备时长等字段。 */
function scheduleQuantity(value: unknown): ReportMetric {
  const numeric = typeof value === 'string' && /^\d+(?:\.0+)?$/.test(value.trim()) ? Number(value.trim()) : value
  return sourceMetric(numeric)
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
  const values = records.map(record => scheduleQuantity(record[field]))
  const valid = values.filter(value => value.value !== null)
  if (!valid.length) return missingMetric('该范围记录数值均缺失或无效')
  const metric = sourceMetric(valid.reduce((total, item) => total + item.value!, 0))
  if ((source.incompleteScope || valid.length !== values.length) && metric.value !== null) {
    metric.status = 'partial'
    metric.note = '部分记录归属或数值无效，仅合计已确认部分，不参与比率与排行'
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
export function scheduleContext(query: DailyReportQuery, sources: ReportSource[], emptyRejectsAreZero = false): ScheduleContext {
  const [rawPlans, rawActuals, rejectSource] = sources
  const key = `${query.department}:${query.processType}`
  const inScope = (record: ApiRecord) => dateOf(record) === query.date && scopeOf(record) === key
  const unknownProcesses = new Set<string>()
  const scopedSource = (source: ReportSource): ReportSource => {
    const unknown = (source.records ?? []).filter(record => dateOf(record) === query.date &&
      (!text(record.dept) || text(record.dept) === query.department) && !scopeOf(record))
    for (const record of unknown) unknownProcesses.add(text(record.process) || '未标明工序')
    const invalidDates = (source.records ?? []).some(record => !dateOf(record) && (!text(record.dept) || text(record.dept) === query.department))
    return { ...source, incompleteScope: source.incompleteScope || unknown.length > 0 || invalidDates }
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
  let incompleteRejectScope = !!rejectSource.incompleteScope
  const rejects = (rejectSource.records ?? []).filter(record => {
    if (!dateOf(record)) { incompleteRejectScope = true; return false }
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
  const plans = (planSource.records ?? []).filter(inScope)
  const actuals = (actualSource.records ?? []).filter(inScope)
  const summaries: [ReportSource, ApiRecord[], string][] = [[planSource, plans, '生产计划'], [actualSource, actuals, '生产实绩'], [rejectSource, rejects, '不良记录']]
  summaries.forEach(([source, rows, label]) => {
    if (source.records === null) return
    const emptyNote = label === '不良记录' && emptyRejectsAreZero && !incompleteRejectScope ? '按生产口径记为零。' : '不代表数量为零。'
    if (!source.records.length) notes.push(`${query.date.slice(0, 7)} 月${label}接口未返回记录；${emptyNote}`)
    else if (!rows.length) notes.push(`${label}有月记录，但未找到所选日期、部门和工序的匹配记录；${emptyNote}`)
    if (rows.some(record => scheduleQuantity(record.number).value === null)) notes.push(`${label}部分数量缺失或无效，只展示有效部分，不参与比率与排行。`)
  })
  if ([rawPlans, rawActuals].some(source => source.records?.some(record => !dateOf(record) && (!text(record.dept) || text(record.dept) === query.department)))) notes.push('部分生产记录日期缺失或无效，无法确认数据日；已知合计标为部分。')
  if (unknownProcesses.size) notes.push(`以下记录的部门或工序归属尚未确认，未计入合计：${[...unknownProcesses].sort().join('、')}。已确认数量仍可查看，但不参与排行。`)
  if (incompleteRejectScope) notes.push('部分不良记录无法确认部门与工序归属，已排除；不良合计仅供核对，不参与排行。')
  return { plans, actuals,
    rejects, planSource, actualSource, rejectSource, notes, incompleteRejectScope }
}

/** 生产与品质共用已确认的数量公式及不良空数据规则。 */
function productionQuantities(plans: ApiRecord[], actuals: ApiRecord[], rejects: ApiRecord[], context: ScheduleContext) {
  const rejectSource = { ...context.rejectSource, incompleteScope: context.incompleteRejectScope }
  const rejectSum = (records: ApiRecord[], source = rejectSource): ReportMetric => {
    if (!records.length && source.records !== null && !source.incompleteScope) return sourceMetric(0)
    return sum(records, source)
  }
  const classifiedSource = { ...rejectSource, incompleteScope: rejectSource.incompleteScope || rejects.some(record => !text(record.type)) }
  const defective = rejectSum(rejects.filter(record => text(record.type) === '不良'), classifiedSource)
  const other = rejectSum(rejects.filter(record => text(record.type) && text(record.type) !== '不良'), classifiedSource)
  const scrapped = rejectSum(rejects)
  const flowing = sum(actuals, context.actualSource)
  const add = (left: ReportMetric, right: ReportMetric): ReportMetric => {
    if (left.value === null || right.value === null) return missingMetric('计算来源缺失或无效')
    const result = sourceMetric(left.value + right.value)
    if (result.value !== null && (left.status !== 'complete' || right.status !== 'complete')) {
      result.status = 'partial'
      result.note = '计算来源不完整，仅展示已确认部分，不参与比率与排行'
    }
    return result
  }
  return { plan: sum(plans, context.planSource), flowing, defective, scrapped,
    actual: add(flowing, scrapped), qualified: add(flowing, other) }
}

function productionDimensionContext(context: ScheduleContext, field: 'zhifan' | 'shebei'): ScheduleContext {
  const missing = (records: ApiRecord[]) => records.some(record => !text(record[field]))
  if ([context.plans, context.actuals, context.rejects].some(missing)) {
    context.notes.push(`部分生产记录缺少${field === 'zhifan' ? '制番' : '设备编码'}，无法计入对应明细；相关合计不参与比率与排行。`)
  }
  return { ...context,
    planSource: { ...context.planSource, incompleteScope: context.planSource.incompleteScope || missing(context.plans) },
    actualSource: { ...context.actualSource, incompleteScope: context.actualSource.incompleteScope || missing(context.actuals) },
    incompleteRejectScope: context.incompleteRejectScope || missing(context.rejects) }
}

export function productionRows(context: ScheduleContext): ReportProductionRow[] {
  const scoped = productionDimensionContext(context, 'zhifan')
  const numbers = new Set([...context.plans, ...context.actuals, ...context.rejects].map(record => text(record.zhifan)).filter(Boolean))
  return [...numbers].sort().map(number => ({ id: number, name: number,
    ...productionQuantities(context.plans.filter(record => text(record.zhifan) === number),
      context.actuals.filter(record => text(record.zhifan) === number),
      context.rejects.filter(record => text(record.zhifan) === number), scoped) }))
}

export function qualityRows(query: DailyReportQuery, context: ScheduleContext, devices: ReportSource): ReportQualityRow[] {
  const scoped = productionDimensionContext({ ...context, plans: [] }, 'zhifan')
  const deviceRecords = scopedDeviceRecords(query, devices, context.notes)
  const numbers = new Set([...context.actuals, ...context.rejects].map(record => text(record.zhifan)).filter(Boolean))
  return [...numbers].sort().map(number => {
    const actuals = context.actuals.filter(record => text(record.zhifan) === number)
    const rejects = context.rejects.filter(record => text(record.zhifan) === number)
    const codes = new Set([...actuals, ...rejects].map(record => deviceCode(record.shebei)).filter(Boolean))
    const quantities = productionQuantities([], actuals, rejects, scoped)
    return { id: number, name: number, dimension: 'production_number', productionNumbers: [number],
      lines: [...codes].sort().map(code => ({ id: code, name: text(deviceRecords.get(code)?.deviceName) || code })),
      actual: quantities.actual, qualified: quantities.qualified, defective: quantities.defective,
      reasons: null, reasonNote: '当前接口未提供不良现象和模具关联；按制番展示，现象明细保留缺失。' }
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

/** 名称及时间均只关联本次查询范围内的唯一设备记录。 */
function scopedDeviceRecords(query: DailyReportQuery, devices: ReportSource, notes: string[]) {
  const deviceRecords = new Map<string, ApiRecord | null>()
  let excluded = 0
  for (const record of devices.records ?? []) {
    if (record.day !== query.date || text(record.departmentId) !== query.department || processOf(record.processType) !== query.processType) { excluded++; continue }
    const code = deviceCode(record.deviceCode)
    if (code) deviceRecords.set(code, deviceRecords.has(code) ? null : record)
    else excluded++
  }
  if (excluded) notes.push(`设备时长源有 ${excluded} 条记录的日期、归属或设备编码不匹配，已排除。`)
  if ([...deviceRecords.values()].some(record => record === null)) notes.push('设备时长源存在重复设备，相关时长保留缺失，避免重复合计。')
  return deviceRecords
}

export function lineRows(query: DailyReportQuery, context: ScheduleContext, devices: ReportSource): ReportLineRow[] {
  const scoped = productionDimensionContext(context, 'shebei')
  const deviceRecords = scopedDeviceRecords(query, devices, context.notes)
  const matched = [...deviceRecords.values()].filter((record): record is ApiRecord => record !== null)
  if (matched.length && matched.every(record => record.totalRunHours === 0 && record.productionHours === 0 && record.obstructionHours === 0)) context.notes.push('本次匹配设备的总运转、生产和阻碍时间全部返回 0，按原值展示；是否已采集完整需后端确认。')
  if (devices.records !== null && !deviceRecords.size) context.notes.push('设备时长源未返回匹配记录；保留已有计划和实绩。')
  const codes = new Set([...context.plans, ...context.actuals, ...context.rejects].map(record => deviceCode(record.shebei)).filter(Boolean))
  for (const code of deviceRecords.keys()) codes.add(code)
  return [...codes].sort().map(code => {
    const record = deviceRecords.get(code)
    const quantities = productionQuantities(context.plans.filter(row => deviceCode(row.shebei) === code),
      context.actuals.filter(row => deviceCode(row.shebei) === code),
      context.rejects.filter(row => deviceCode(row.shebei) === code), scoped)
    return { id: code, name: text(record?.deviceName) || code,
      plan: quantities.plan, actual: quantities.actual,
      availableSeconds: missingMetric('未明确已扣除计划停止的可运转时间'), plannedStopSeconds: missingMetric('未提供计划停止时间'),
      totalRunSeconds: sourceMetric(record?.totalRunHours, false, 3600),
      productionSeconds: sourceMetric(record?.productionHours, false, 3600), lossSeconds: sourceMetric(record?.obstructionHours, false, 3600),
      reportedAvailabilityRate: sourceMetric(record?.availabilityRate, false), reasons: obstructionReasons(record?.obstructionItems) }
  })
}
