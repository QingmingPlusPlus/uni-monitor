import type {
  CssMapDepartmentValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import type { DepartmentDashboardData } from '../factoryDashboardTypes'
import { loadAttendanceCard } from '../loaders/loadAttendanceCard'
import { loadAttendanceTrendCard } from '../loaders/loadAttendanceTrendCard'
import { createFactorySummaryData } from '../loaders/createFactorySummaryData'
import { loadInboundPlanTrendCard } from '../loaders/loadInboundPlanTrendCard'
import { loadPersonnelDetailCard } from '../loaders/loadPersonnelDetailCard'
import { loadProductionActivityData } from '../loaders/loadProductionActivityData'
import { loadProductionPlanTrendCard } from '../loaders/loadProductionPlanTrendCard'
import { buildCacheKey, invalidateCache, readCache, writeCache } from './dashboardCache'

const CACHE_KEY_PREFIX = 'uni-monitor:department-dashboard:' as const

let inflightPromise: Promise<DepartmentDashboardData> | null = null
let inflightKey = ''

function isDepartmentDashboardData(value: unknown): value is DepartmentDashboardData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DepartmentDashboardData).summary === 'object'
  )
}

/** 单卡片刷新后清除整页缓存，避免后续整页刷新命中旧缓存回滚该卡片数据。 */
export function invalidateDepartmentDashboardCache(
  department: CssMapDepartmentValue,
  monthSegmentVersion: number,
): void {
  invalidateCache(
    CACHE_KEY_PREFIX,
    department,
    monthSegmentVersion,
    'DepartmentLoader',
    { key: inflightKey, promise: inflightPromise },
  )
}

/**
 * 异步加载部门维度看板数据，覆盖四个瀑布流卡片。
 *
 * - Promise 去重：相同 key 的并发调用复用同一个 promise
 * - sessionStorage 缓存（TTL 60s）
 * - 任意卡片接口失败时该卡片降级为 fallback，不阻塞其他卡片
 *
 * @param fallback 同步 mock 数据，作为接口未就绪或失败时的降级值
 */
export async function loadDepartmentDashboardData(
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
  monthSegmentVersion: number,
  fallback: DepartmentDashboardData,
): Promise<DepartmentDashboardData> {
  const cacheKey = buildCacheKey(CACHE_KEY_PREFIX, department, monthSegmentVersion)

  const cached = readCache(cacheKey, isDepartmentDashboardData, 'DepartmentLoader')
  if (cached !== null) {
    return cached
  }

  if (inflightPromise !== null && inflightKey === cacheKey) {
    return inflightPromise
  }

  inflightKey = cacheKey
  inflightPromise = doLoadDepartmentDashboardData(department, config, refreshedAt, fallback)
    .finally(() => {
      inflightPromise = null
      inflightKey = ''
    })

  return inflightPromise
}

async function doLoadDepartmentDashboardData(
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
  fallback: DepartmentDashboardData,
): Promise<DepartmentDashboardData> {
  const processTypes = config.departmentProcessMap[department] ?? []
  const cacheKey = buildCacheKey(CACHE_KEY_PREFIX, department, 0)

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
  const resolvedProductionPlanTrend = productionPlanTrend.status === 'fulfilled' ? productionPlanTrend.value : null

  let summary = fallback.summary
  try {
    summary = await createFactorySummaryData({
      activity: resolvedActivity,
      attendance: resolvedAttendance,
      processTypes,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentLoader] 信息汇总生成失败: ${error.message}`)
    }
  }

  const result: DepartmentDashboardData = {
    ...fallback,
    summary,
    activity: resolvedActivity,
    attendance: resolvedAttendance,
    attendanceTrend: resolvedAttendanceTrend,
    inboundPlanTrend: resolvedInboundPlanTrend,
    personnelDetail: personnelDetail.status === 'fulfilled' ? personnelDetail.value : fallback.personnelDetail,
  }

  writeCache(cacheKey, result, 'DepartmentLoader')
  return result
}
