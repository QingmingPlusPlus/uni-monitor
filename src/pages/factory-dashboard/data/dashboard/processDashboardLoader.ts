import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import type { ProcessDashboardData } from '../factoryDashboardTypes'
import { loadAttendanceCard } from '../loaders/loadAttendanceCard'
import { loadAttendanceTrendCard } from '../loaders/loadAttendanceTrendCard'
import { createFactorySummaryData } from '../loaders/createFactorySummaryData'
import { loadInboundPlanTrendCard } from '../loaders/loadInboundPlanTrendCard'
import { loadPersonnelDetailCard } from '../loaders/loadPersonnelDetailCard'
import { loadProductionActivityData } from '../loaders/loadProductionActivityData'
import { loadProductionPlanTrendCard } from '../loaders/loadProductionPlanTrendCard'
import { buildCacheKey, invalidateCache, readCache, writeCache } from './dashboardCache'

const PROCESS_CACHE_KEY_PREFIX = 'uni-monitor:process-dashboard:' as const

let processInflightPromise: Promise<ProcessDashboardData> | null = null
let processInflightKey = ''

function isProcessDashboardData(value: unknown): value is ProcessDashboardData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ProcessDashboardData).summary === 'object'
  )
}

export function invalidateProcessDashboardCache(
  processType: CssMapProcessValue,
  monthSegmentVersion: number,
): void {
  invalidateCache(
    PROCESS_CACHE_KEY_PREFIX,
    processType,
    monthSegmentVersion,
    'ProcessLoader',
    { key: processInflightKey, promise: processInflightPromise },
  )
}

export async function loadProcessDashboardData(
  processType: CssMapProcessValue,
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
  monthSegmentVersion: number,
  fallback: ProcessDashboardData,
): Promise<ProcessDashboardData> {
  const cacheKey = buildCacheKey(PROCESS_CACHE_KEY_PREFIX, processType, monthSegmentVersion)
  const cached = readCache(cacheKey, isProcessDashboardData, 'ProcessLoader')
  if (cached !== null) return cached

  if (processInflightPromise !== null && processInflightKey === cacheKey) {
    return processInflightPromise
  }

  processInflightKey = cacheKey
  processInflightPromise = doLoadProcessDashboardData(processType, department, config, refreshedAt, fallback)
    .finally(() => {
      processInflightPromise = null
      processInflightKey = ''
    })

  return processInflightPromise
}

async function doLoadProcessDashboardData(
  processType: CssMapProcessValue,
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
  fallback: ProcessDashboardData,
): Promise<ProcessDashboardData> {
  const processTypes = [processType] as const
  const cacheKey = buildCacheKey(PROCESS_CACHE_KEY_PREFIX, processType, 0)

  const [activity, attendance, attendanceTrend, inboundPlanTrend, productionPlanTrend, personnelDetail] = await Promise.allSettled([
    loadProductionActivityData(department, processTypes, config),
    loadAttendanceCard(department, processTypes, config, refreshedAt),
    loadAttendanceTrendCard(department, processTypes),
    loadInboundPlanTrendCard(department, processTypes),
    loadProductionPlanTrendCard(department, processTypes),
    loadPersonnelDetailCard(department, processTypes, config, refreshedAt),
  ])

  const resolvedActivity = activity.status === 'fulfilled' ? activity.value : fallback.activity
  const resolvedAttendance = attendance.status === 'fulfilled' ? attendance.value : fallback.attendance
  const resolvedAttendanceTrend = attendanceTrend.status === 'fulfilled' ? attendanceTrend.value : fallback.attendanceTrend
  const resolvedInboundPlanTrend = inboundPlanTrend.status === 'fulfilled' ? inboundPlanTrend.value : fallback.inboundPlanTrend
  const resolvedProductionPlanTrend = productionPlanTrend.status === 'fulfilled' ? productionPlanTrend.value : fallback.productionPlanTrend

  let summary = fallback.summary
  try {
    summary = await createFactorySummaryData({
      activity: resolvedActivity,
      attendance: resolvedAttendance,
      processTypes,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[ProcessLoader] 信息汇总生成失败: ${error.message}`)
    }
  }

  const result: ProcessDashboardData = {
    ...fallback,
    summary,
    activity: resolvedActivity,
    attendance: resolvedAttendance,
    attendanceTrend: resolvedAttendanceTrend,
    inboundPlanTrend: resolvedInboundPlanTrend,
    productionPlanTrend: resolvedProductionPlanTrend,
    personnelDetail: personnelDetail.status === 'fulfilled' ? personnelDetail.value : fallback.personnelDetail,
  }

  writeCache(cacheKey, result, 'ProcessLoader')
  return result
}
