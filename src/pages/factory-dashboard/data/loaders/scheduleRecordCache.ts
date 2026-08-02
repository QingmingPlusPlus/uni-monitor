import {
  getScheduleOutputByMonth,
  getSchedulePlanByMonth,
  getScheduleRukuPlanByMonth,
  getScheduleRukuShijiByMonth,
} from '../../../../api/schedule'
import type {
  ScheduleMonthlyRecord,
  ScheduleRukuPlanRecord,
  ScheduleRukuShijiRecord,
} from '../../../../api/schedule'

const schedulePlanCache = new Map<string, Promise<readonly ScheduleMonthlyRecord[]>>()
const scheduleOutputCache = new Map<string, Promise<readonly ScheduleMonthlyRecord[]>>()
const scheduleRukuPlanCache = new Map<string, Promise<readonly ScheduleRukuPlanRecord[]>>()
const scheduleRukuShijiCache = new Map<string, Promise<readonly ScheduleRukuShijiRecord[]>>()

export interface ScheduleTrendLoadOptions {
  readonly forceRefresh?: boolean
}

async function readScheduleRecords<T>(
  loader: () => Promise<{ readonly data?: { readonly data?: T[] | null } }>,
  label: string,
): Promise<readonly T[]> {
  try {
    const response = await loader()
    const data = response.data?.data
    return Array.isArray(data) ? data : []
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DashboardLoader] ${label}接口失败: ${error.message}`)
    }
    return []
  }
}

function getCachedScheduleRecords<T>(
  cache: Map<string, Promise<readonly T[]>>,
  month: string,
  loader: () => Promise<readonly T[]>,
): Promise<readonly T[]> {
  const cached = cache.get(month)
  if (cached !== undefined) return cached

  const promise = loader()
  cache.set(month, promise)
  return promise
}

export function loadSchedulePlanRecords(month: string): Promise<readonly ScheduleMonthlyRecord[]> {
  return getCachedScheduleRecords(schedulePlanCache, month, () =>
    readScheduleRecords(() => getSchedulePlanByMonth(month), '生产计划'))
}

export function loadScheduleOutputRecords(month: string): Promise<readonly ScheduleMonthlyRecord[]> {
  return getCachedScheduleRecords(scheduleOutputCache, month, () =>
    readScheduleRecords(() => getScheduleOutputByMonth(month), '生产实绩'))
}

export function invalidateProductionScheduleRecords(month: string): void {
  schedulePlanCache.delete(month)
  scheduleOutputCache.delete(month)
}

export function loadScheduleRukuPlanRecords(month: string): Promise<readonly ScheduleRukuPlanRecord[]> {
  return getCachedScheduleRecords(scheduleRukuPlanCache, month, () =>
    readScheduleRecords(() => getScheduleRukuPlanByMonth(month), '入库计划'))
}

export function loadScheduleRukuShijiRecords(month: string): Promise<readonly ScheduleRukuShijiRecord[]> {
  return getCachedScheduleRecords(scheduleRukuShijiCache, month, () =>
    readScheduleRecords(() => getScheduleRukuShijiByMonth(month), '入库实绩'))
}

export function invalidateInboundScheduleRecords(month: string): void {
  scheduleRukuPlanCache.delete(month)
  scheduleRukuShijiCache.delete(month)
}
