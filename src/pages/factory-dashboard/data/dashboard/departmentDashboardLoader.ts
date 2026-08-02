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

let inflightPromise: Promise<DepartmentDashboardData> | null = null
let inflightKey = ''

/**
 * 异步加载部门维度看板数据，覆盖四个瀑布流卡片。
 *
 * - Promise 去重：相同 key 的并发调用复用同一个 promise
 * - 不缓存已完成结果，每次页面刷新或筛选变化都重新读取接口
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
  const requestKey = `${department}:v${monthSegmentVersion}`

  if (inflightPromise !== null && inflightKey === requestKey) {
    return inflightPromise
  }

  inflightKey = requestKey
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

  return {
    ...fallback,
    summary,
    activity: resolvedActivity,
    attendance: resolvedAttendance,
    attendanceTrend: resolvedAttendanceTrend,
    inboundPlanTrend: resolvedInboundPlanTrend,
    personnelDetail: personnelDetail.status === 'fulfilled' ? personnelDetail.value : fallback.personnelDetail,
  }
}
