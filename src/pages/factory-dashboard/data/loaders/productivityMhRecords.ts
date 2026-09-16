import { getDeviceAvailabilityDailyNet, type DeviceAvailabilityDailyNetParams } from '../../../../api/deviceAvailability'
import type { CssMapDepartmentValue, CssMapProcessValue } from '../../../../components/css-map/css3dMapTypes'
import { toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'
import type { CurrentShiftCutoff } from './dateTimeUtils'
import { extractLocalDateKey } from './dateTimeUtils'
import type { ScheduleTrendLoadOptions } from './scheduleRecordCache'

export interface ProductivityMhRow {
  readonly processType: CssMapProcessValue
  readonly day: number
  readonly netHours: number | null
}

type RawRecords = readonly unknown[] | null
const cache = new Map<string, Promise<RawRecords>>()

function queryKey(params: DeviceAvailabilityDailyNetParams): string {
  return JSON.stringify([params.month, params.departmentId, params.processType, params.deviceCode ?? null])
}

export function invalidateProductivityMhRecords(month: string, department: CssMapDepartmentValue): void {
  const prefix = `${JSON.stringify([month, toApiDepartmentCode(department)]).slice(0, -1)},`
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
}

function loadRecords(params: DeviceAvailabilityDailyNetParams): Promise<RawRecords> {
  const key = queryKey(params)
  const cached = cache.get(key)
  if (cached) return cached
  const request = Promise.resolve().then(async (): Promise<RawRecords> => {
    try {
      const response = await getDeviceAvailabilityDailyNet(params)
      if (response.data?.success !== true || !Array.isArray(response.data.data)) return null
      return response.data.data
    } catch {
      return null
    }
  }).then(result => {
    // 失败不固定为整月空数据；刷新中的旧请求也不能删除新请求。
    if (result === null && cache.get(key) === request) cache.delete(key)
    return result
  })
  cache.set(key, request)
  return request
}

/** 每个响应是单个查询范围的每日总值；同日重复不能当成额外工时累加。 */
function dailyValues(records: readonly unknown[], month: string, cutoff: CurrentShiftCutoff): Map<number, number | null> {
  const days = new Map<number, number | null>()
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()
  for (const raw of records) {
    if (typeof raw !== 'object' || raw === null) continue
    const record = raw as Record<string, unknown>
    if (typeof record.period !== 'string' || !record.period.startsWith(`${month}-`)) continue
    const dateKey = extractLocalDateKey(record.period)
    if (dateKey === null || dateKey > cutoff.dateKey) continue
    const day = dateKey % 100
    if (day < 1 || day > lastDay) continue
    const value = record.netHours
    const hours = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
    days.set(day, days.has(day) ? null : hours)
  }
  return days
}

/** 严格按卡片设备范围取净工时；缺少设备范围时不扩大到整部门或工序族。 */
export async function loadProductivityMhRows(
  month: string,
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  deviceCodeMap: Readonly<Record<string, ReadonlySet<string>>>,
  cutoff: CurrentShiftCutoff,
  options: ScheduleTrendLoadOptions,
): Promise<readonly ProductivityMhRow[]> {
  const groups = new Map<CssMapProcessValue, string[]>()
  const jobs = new Map<string, { params: DeviceAvailabilityDailyNetParams; processes: CssMapProcessValue[] }>()
  for (const processType of new Set(processTypes)) {
    const apiProcess = toApiProcessType(processType)
    const codeSet = deviceCodeMap[processType]
    const codes = [...(codeSet ?? [])]
    const keys: string[] = []
    for (const deviceCode of codes) {
      const params = { month, departmentId: toApiDepartmentCode(department), processType: apiProcess, ...(deviceCode ? { deviceCode } : {}) }
      const key = queryKey(params)
      keys.push(key)
      const job = jobs.get(key)
      if (job) job.processes.push(processType)
      else jobs.set(key, { params, processes: [processType] })
    }
    groups.set(processType, keys)
  }
  if (options.forceRefresh) invalidateProductivityMhRecords(month, department)
  const pending = [...jobs.entries()]
  const results = new Map<string, RawRecords>()
  const failed = new Set<CssMapProcessValue>()
  let next = 0
  async function worker(): Promise<void> {
    while (next < pending.length) {
      const [key, job] = pending[next++]
      // 一个设备请求失败后该工序已无法得到完整分母，停止其余排队请求。
      if (job.processes.every(process => failed.has(process))) continue
      const records = await loadRecords(job.params)
      results.set(key, records)
      if (records === null) job.processes.forEach(process => failed.add(process))
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, pending.length) }, worker))
  return [...groups].flatMap(([processType, keys]) => {
    if (keys.length === 0 || failed.has(processType)) return []
    const sources = keys.map(key => dailyValues(results.get(key) ?? [], month, cutoff))
    const days = new Set(sources.flatMap(source => [...source.keys()]))
    return [...days].map(day => {
      let total: number | null = 0
      for (const source of sources) {
        const value = source.get(day)
        if (value === undefined || value === null) { total = null; break }
        total += value
      }
      return { processType, day, netHours: total !== null && Number.isFinite(total) ? total : null }
    })
  })
}
