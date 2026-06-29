import {
  getAttendanceDetailSituation,
  getAttendanceSituation,
  getMonthlyAttendanceSituation,
} from '../../../api/attendance'
import { getScheduleRukuPlanByMonth } from '../../../api/schedule'
import type { AttendanceDetailSituationVO } from '../../../api/attendance'
import type { CurrentAttendanceStatisticsVO } from '../../../api/attendance'
import type { ScheduleRukuPlanRecord } from '../../../api/schedule'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../components/css-map/css3dMapTypes'
import {
  getCssMapDepartmentLabel,
  getCssMapProcessLabel,
} from '../../../components/css-map/css3dMapSelection'
import { createAttendanceTrendCardData } from '../../../components/attendance-trend-card/attendanceTrendMock'
import type { AttendanceTrendDailyRow } from '../../../components/attendance-trend-card/attendanceTrendMock'
import { createDepartmentInboundPlanTrendCardData } from '../../../components/department-inbound-plan-trend-card/departmentInboundPlanTrendMock'
import type { DepartmentInboundDailyRow } from '../../../components/department-inbound-plan-trend-card/departmentInboundPlanTrendMock'
import { getProcessSegments } from '../../../utils/monthSegment'
import type { DepartmentDashboardData, FactoryDashboardCard } from './factoryDashboardTypes'
import type {
  PersonnelAttendanceData,
  PersonnelAttendanceProcessGroup,
  PersonnelAttendanceRow,
  PersonnelAttendanceShift,
} from './factoryDashboardTypes'
import type {
  PersonnelDetailAttendanceState,
  PersonnelDetailAttendanceStatus,
  PersonnelDetailCapability,
  PersonnelDetailData,
  PersonnelDetailRow,
  PersonnelDetailShift,
} from './personnelDetailMock'

// 注：PersonnelDetail* 为 string union 类型，使用字面量值而非 enum 访问

// ---------------------------------------------------------------------------
// 值映射：CssMap 值 → API 参数
// ---------------------------------------------------------------------------

/** CssMapDepartmentValue ('department1'..'department4') → API 科室编号 ('1'..'4') */
function toApiDepartmentCode(value: CssMapDepartmentValue): string {
  return value.replace('department', '')
}

/** CssMapProcessValue → API 工序类型 ('preprocessing' | 'sulfur_addition' | 'post_processing') */
function toApiProcessType(value: CssMapProcessValue): string {
  const prefix = value.replace(/[0-9]+$/u, '')
  const map: Readonly<Record<string, string>> = {
    pretreatment: 'preprocessing',
    vulcanization: 'sulfur_addition',
    posttreatment: 'post_processing',
  }
  return map[prefix] ?? prefix
}

function getCurrentMonthParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentDateParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// 工序族工具（复用 mock 的去尾数字逻辑）
// ---------------------------------------------------------------------------

function removeTrailingProcessNumber(label: string): string {
  return label.replace(/[0-9０-９]+$/u, '')
}

function getProcessFamilyLabel(processId: CssMapProcessValue, config: CssMapSelectionConfig): string {
  return removeTrailingProcessNumber(getCssMapProcessLabel(processId, config))
}

// ---------------------------------------------------------------------------
// 时间格式与通用工具
// ---------------------------------------------------------------------------

const refreshedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function extractDayFromDate(dateStr: string): number {
  const parts = dateStr.split('-')
  return parts.length >= 3 ? Number(parts[2]) : 1
}

function sumBy<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0)
}

function calculateAttendanceRate(rosterTotal: number, actualAttendance: number): number | null {
  if (rosterTotal === 0) return null
  return Number(((actualAttendance / rosterTotal) * 100).toFixed(1))
}

// ---------------------------------------------------------------------------
// #1 人员出勤适配：CurrentAttendanceStatisticsVO[] → PersonnelAttendanceData
// ---------------------------------------------------------------------------

/** 接口 positionType: 'direct' | 'indirect' */
type ApiPositionType = 'direct' | 'indirect'

function mapShiftType(shiftType: string): PersonnelAttendanceShift {
  if (shiftType.includes('夜')) return 'night'
  if (shiftType.includes('早') || shiftType.includes('白')) return 'day'
  return 'regular'
}

function voShiftLabel(shiftType: string): string {
  if (shiftType.includes('夜')) return '夜班'
  if (shiftType.includes('早') || shiftType.includes('白')) return '早班'
  return shiftType || '正常班'
}

/**
 * 将按职务的扁平行聚合为出勤卡所需结构。
 *
 * 接口返回 (shiftType, positionType, positionName, schedulePersonCount, actualAttendancePersonCount)。
 * 卡片需要按工序族分组的 (indirectDirectRoster, directTeamLeader, directRegular, ...) 明细。
 *
 * 接口不提供 teamLeader/regular/dispatched/temporary/standby 的拆分，
 * 因此把同工序族同班次的 direct 明细合并到 directRegular，其余明细置 0。
 * indirect 行合并到 indirectDirectRoster。
 */
function aggregateAttendanceRows(
  vos: readonly CurrentAttendanceStatisticsVO[],
): readonly PersonnelAttendanceRow[] {
  const shiftGroups = new Map<string, CurrentAttendanceStatisticsVO[]>()

  for (const vo of vos) {
    const shiftKey = vo.shiftType ?? ''
    const list = shiftGroups.get(shiftKey)
    if (list !== undefined) {
      list.push(vo)
    } else {
      shiftGroups.set(shiftKey, [vo])
    }
  }

  const rows: PersonnelAttendanceRow[] = []

  for (const [shiftType, positions] of shiftGroups) {
    const shift = mapShiftType(shiftType)
    const shiftLabel = voShiftLabel(shiftType)
    const directPositions = positions.filter((p) => (p.positionType as ApiPositionType) === 'direct')
    const indirectPositions = positions.filter((p) => (p.positionType as ApiPositionType) === 'indirect')

    const indirectDirectRoster = sumBy(indirectPositions, (p) => p.schedulePersonCount)
    const indirectLeaderAttendance = sumBy(indirectPositions, (p) => p.actualAttendancePersonCount)
    const directRosterTotal = sumBy(directPositions, (p) => p.schedulePersonCount)
    const actualAttendance = sumBy(directPositions, (p) => p.actualAttendancePersonCount)

    rows.push({
      id: `${shiftType}-detail`,
      shift,
      shiftLabel,
      indirectDirectRoster,
      indirectLeaderRoster: 0,
      indirectLeaderAttendance,
      directTeamLeader: 0,
      directRegular: directRosterTotal,
      directDispatched: 0,
      directTemporary: 0,
      directStandby: 0,
      directRosterTotal,
      actualAttendance,
      attendanceRate: calculateAttendanceRate(directRosterTotal, actualAttendance),
    })
  }

  return rows
}

function createAttendanceSummaryRow(
  groupId: string,
  shift: PersonnelAttendanceShift,
  shiftLabel: string,
  rows: readonly PersonnelAttendanceRow[],
): PersonnelAttendanceRow {
  const directRosterTotal = rows.reduce((total, row) => total + row.directRosterTotal, 0)
  const actualAttendance = rows.reduce((total, row) => total + row.actualAttendance, 0)

  return {
    id: `${groupId}-${shift}`,
    shift,
    shiftLabel,
    indirectDirectRoster: rows.reduce((total, row) => total + row.indirectDirectRoster, 0),
    indirectLeaderRoster: rows.reduce((total, row) => total + row.indirectLeaderRoster, 0),
    indirectLeaderAttendance: rows.reduce((total, row) => total + (row.indirectLeaderAttendance ?? 0), 0),
    directTeamLeader: rows.reduce((total, row) => total + row.directTeamLeader, 0),
    directRegular: rows.reduce((total, row) => total + row.directRegular, 0),
    directDispatched: rows.reduce((total, row) => total + row.directDispatched, 0),
    directTemporary: rows.reduce((total, row) => total + row.directTemporary, 0),
    directStandby: rows.reduce((total, row) => total + row.directStandby, 0),
    directRosterTotal,
    actualAttendance,
    attendanceRate: calculateAttendanceRate(directRosterTotal, actualAttendance),
  }
}

/**
 * 人员出勤适配：按 processTypes[] 多次调用 getAttendanceSituation，前端按工序族分组聚合。
 */
export async function loadAttendanceCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig,
  refreshedAt: Date,
): Promise<PersonnelAttendanceData> {
  const departmentCode = toApiDepartmentCode(department)
  const date = getCurrentDateParam()

  const familyGroups = new Map<string, CssMapProcessValue[]>()
  for (const processId of processTypes) {
    const familyLabel = getProcessFamilyLabel(processId, config)
    const list = familyGroups.get(familyLabel)
    if (list !== undefined) {
      list.push(processId)
    } else {
      familyGroups.set(familyLabel, [processId])
    }
  }

  const groups: PersonnelAttendanceProcessGroup[] = []

  for (const [familyLabel, processIds] of familyGroups) {
    const allVos: CurrentAttendanceStatisticsVO[] = []
    for (const processId of processIds) {
      try {
        const response = await getAttendanceSituation({
          date,
          department: departmentCode,
          processType: toApiProcessType(processId),
        })
        const vos = response.data?.data
        if (Array.isArray(vos)) {
          allVos.push(...vos)
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(`[DepartmentLoader] 人员出勤接口失败 (${processId}): ${error.message}`)
        }
      }
    }

    const detailRows = aggregateAttendanceRows(allVos)
    const totalRow = createAttendanceSummaryRow(familyLabel, 'total', '合计', detailRows)

    groups.push({
      id: familyLabel,
      label: familyLabel,
      rows: [...detailRows, totalRow],
    })
  }

  if (groups.length >= 2) {
    const departmentLabel = getCssMapDepartmentLabel(department, config)
    const allDetailRows = groups.flatMap((g) => g.rows.filter((r) => r.shift !== 'total'))
    const shifts: ReadonlyArray<{ shift: PersonnelAttendanceShift; label: string }> = [
      { shift: 'day', label: '早班' },
      { shift: 'night', label: '夜班' },
      { shift: 'regular', label: '正常班' },
      { shift: 'total', label: '合计' },
    ]
    const summaryRows = shifts.map(({ shift, label }) => {
      const matching = allDetailRows.filter((r) => r.shift === shift)
      return createAttendanceSummaryRow(`${departmentLabel}-all`, shift, label, matching)
    })
    groups.push({
      id: `${departmentLabel}-all`,
      label: `${departmentLabel}全体`,
      rows: summaryRows,
    })
  }

  return {
    title: '人员出勤情况',
    subtitle: getCssMapDepartmentLabel(department, config),
    refreshedAt: refreshedAtFormatter.format(refreshedAt),
    groups,
  }
}

// ---------------------------------------------------------------------------
// #2 出勤率推移适配：MonthlyAttendanceStatisticsVO[] → AttendanceTrendDailyRow[]
// ---------------------------------------------------------------------------

/**
 * 出勤率推移适配：按 processTypes[] 多次调用 getMonthlyAttendanceSituation，
 * 转为 AttendanceTrendDailyRow[] 后复用 createAttendanceTrendCardData 周汇总逻辑。
 *
 * 接口不提供 targetRate（利记出勤率）字段，此处暂置 0，缺口见 doc/department-api-gaps.md。
 */
export async function loadAttendanceTrendCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
): Promise<FactoryDashboardCard | null> {
  const departmentCode = toApiDepartmentCode(department)
  const month = getCurrentMonthParam()

  const dailyRows: AttendanceTrendDailyRow[] = []

  await Promise.all(
    processTypes.map(async (processId) => {
      try {
        const response = await getMonthlyAttendanceSituation({
          month,
          department: departmentCode,
          processType: toApiProcessType(processId),
        })
        const vos = response.data?.data
        if (!Array.isArray(vos)) return

        for (const vo of vos) {
          dailyRows.push({
            processType: processId,
            day: extractDayFromDate(vo.statDate),
            indirectCount: vo.indirectSchedulePersonCount,
            directCount: vo.directSchedulePersonCount,
            directAttendance: vo.directAttendancePersonCount,
            targetRate: 0,
          })
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(`[DepartmentLoader] 出勤率推移接口失败 (${processId}): ${error.message}`)
        }
      }
    }),
  )

  return createAttendanceTrendCardData(processTypes, getProcessSegments, dailyRows)
}

// ---------------------------------------------------------------------------
// #3 入库计划适配：ScheduleRukuPlanRecord[] → DepartmentInboundDailyRow[]
// ---------------------------------------------------------------------------

/**
 * 入库计划适配：调用 getScheduleRukuPlanByMonth（接口无 department/processType 过滤参数）。
 *
 * 接口只返回 number（计划数），无实绩字段；actualInbound 暂置 0，缺口见 doc/department-api-gaps.md。
 * 接口无 processType 字段，所有记录归入 processTypes[0] 的桶以复用周汇总逻辑。
 */
export async function loadInboundPlanTrendCard(
  processTypes: readonly CssMapProcessValue[],
): Promise<FactoryDashboardCard | null> {
  if (processTypes.length === 0) return null

  const month = getCurrentMonthParam()

  let records: ScheduleRukuPlanRecord[] = []
  try {
    const response = await getScheduleRukuPlanByMonth(month)
    records = response.data?.data ?? []
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentLoader] 入库计划接口失败: ${error.message}`)
    }
    return null
  }

  const planByDay = new Map<number, number>()
  for (const record of records) {
    const day = extractDayFromDate(record.date)
    planByDay.set(day, (planByDay.get(day) ?? 0) + (record.number ?? 0))
  }

  const bucketProcessType = processTypes[0]
  const dailyRows: DepartmentInboundDailyRow[] = Array.from(planByDay.entries()).map(([day, planInbound]) => ({
    processType: bucketProcessType,
    day,
    planInbound,
    actualInbound: 0,
  }))

  return createDepartmentInboundPlanTrendCardData([bucketProcessType], getProcessSegments, dailyRows)
}

// ---------------------------------------------------------------------------
// #4 人员明细适配：AttendanceDetailSituationVO[] → PersonnelDetailRow[]
// ---------------------------------------------------------------------------

function mapAttendanceStatus(situation: string): PersonnelDetailAttendanceStatus {
  if (situation.includes('年假')) return 'annual-leave'
  if (situation.includes('病假')) return 'sick-leave'
  if (situation.includes('事假')) return 'personal-leave'
  if (situation.includes('出差') || situation.includes('公出')) return 'business-travel'
  if (situation.includes('缺勤') || situation.includes('旷工')) return 'absent'
  return 'present'
}

function attendanceStatusLabel(status: PersonnelDetailAttendanceStatus): string {
  const map: Record<PersonnelDetailAttendanceStatus, string> = {
    'present': '出勤',
    'annual-leave': '年假',
    'sick-leave': '病假',
    'personal-leave': '事假',
    'business-travel': '出差',
    'absent': '缺勤',
  }
  return map[status]
}

function mapAttendanceState(state: string): PersonnelDetailAttendanceState {
  if (state.includes('管理')) return 'management'
  if (state.includes('作业') || state.includes('操作')) return 'operation'
  if (state.includes('顶岗')) return 'standby'
  return 'none'
}

function attendanceStateLabel(state: PersonnelDetailAttendanceState): string {
  const map: Record<PersonnelDetailAttendanceState, string> = {
    'management': '管理',
    'operation': '作业',
    'standby': '顶岗',
    'none': '-',
  }
  return map[state]
}

function mapCapability(ability: string): PersonnelDetailCapability {
  if (ability === 'A' || ability === 'a') return 'A'
  if (ability === 'B' || ability === 'b') return 'B'
  if (ability === 'C' || ability === 'c') return 'C'
  return 'B'
}

function formatWorkHours(vo: AttendanceDetailSituationVO): string {
  if (!Array.isArray(vo.workHourList) || vo.workHourList.length === 0) return '0h00min'
  return vo.workHourList.map((wh) => `${wh.workHourType} ${wh.workHour}`).join(' ')
}

function mapDetailRow(vo: AttendanceDetailSituationVO, index: number): PersonnelDetailRow {
  const shiftName = vo.shiftName ?? ''
  const shift: PersonnelDetailShift = shiftName.includes('夜')
    ? 'night'
    : shiftName.includes('早') || shiftName.includes('白')
      ? 'day'
      : 'regular'

  const status = mapAttendanceStatus(vo.attendanceSituation ?? '')
  const state = mapAttendanceState(vo.attendanceStatus ?? '')

  return {
    id: `detail-${index + 1}`,
    shift,
    shiftLabel: shiftName || (shift === 'night' ? '夜班' : '早班'),
    employeeId: vo.account ?? '',
    name: vo.realName ?? '',
    position: vo.positionName ?? '',
    jobType: vo.workTypeName ?? '',
    attendanceStatus: status,
    attendanceStatusLabel: attendanceStatusLabel(status),
    attendanceState: state,
    attendanceStateLabel: attendanceStateLabel(state),
    capability: mapCapability(vo.ability ?? ''),
    workingHours: formatWorkHours(vo),
  }
}

/**
 * 人员明细适配：按 processTypes[] 多次调用 getAttendanceDetailSituation，扁平合并所有工序的人员。
 */
export async function loadPersonnelDetailCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig,
  refreshedAt: Date,
): Promise<PersonnelDetailData> {
  const departmentCode = toApiDepartmentCode(department)
  const date = getCurrentDateParam()

  const allVos: AttendanceDetailSituationVO[] = []

  await Promise.all(
    processTypes.map(async (processId) => {
      try {
        const response = await getAttendanceDetailSituation({
          date,
          department: departmentCode,
          processType: toApiProcessType(processId),
        })
        const vos = response.data?.data
        if (Array.isArray(vos)) {
          allVos.push(...vos)
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(`[DepartmentLoader] 人员明细接口失败 (${processId}): ${error.message}`)
        }
      }
    }),
  )

  const rows = allVos.map(mapDetailRow)

  return {
    title: '人员明细及状态',
    subtitle: getCssMapDepartmentLabel(department, config),
    refreshedAt: refreshedAtFormatter.format(refreshedAt),
    rows,
  }
}

// ---------------------------------------------------------------------------
// Loader：Promise 去重 + sessionStorage 缓存 + 降级到 mock
// ---------------------------------------------------------------------------

const CACHE_KEY_PREFIX = 'uni-monitor:department-dashboard:' as const
const CACHE_TTL_MS = 60_000

interface CacheEntry {
  readonly data: DepartmentDashboardData
  readonly timestamp: number
}

let inflightPromise: Promise<DepartmentDashboardData> | null = null
let inflightKey = ''

function buildCacheKey(department: CssMapDepartmentValue, version: number): string {
  return `${CACHE_KEY_PREFIX}${department}:v${version}`
}

/** 单卡片刷新后清除整页缓存，避免后续整页刷新命中旧缓存回滚该卡片数据。 */
export function invalidateDepartmentDashboardCache(
  department: CssMapDepartmentValue,
  monthSegmentVersion: number,
): void {
  try {
    window.sessionStorage.removeItem(buildCacheKey(department, monthSegmentVersion))
    window.sessionStorage.removeItem(buildCacheKey(department, 0))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentLoader] 缓存清理失败: ${error.message}`)
    }
  }
  if (inflightKey === buildCacheKey(department, monthSegmentVersion) || inflightKey === buildCacheKey(department, 0)) {
    inflightKey = ''
    inflightPromise = null
  }
}

function isCacheEntry(value: unknown): value is CacheEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CacheEntry).timestamp === 'number' &&
    typeof (value as CacheEntry).data === 'object' &&
    (value as CacheEntry).data !== null
  )
}

function readCache(key: string): DepartmentDashboardData | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCacheEntry(parsed)) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
    return parsed.data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentLoader] 缓存读取失败: ${error.message}`)
      return null
    }
    throw error
  }
}

function writeCache(key: string, data: DepartmentDashboardData): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() }
    window.sessionStorage.setItem(key, JSON.stringify(entry))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentLoader] 缓存写入失败: ${error.message}`)
      return
    }
    throw error
  }
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
  const cacheKey = buildCacheKey(department, monthSegmentVersion)

  const cached = readCache(cacheKey)
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
  const cacheKey = buildCacheKey(department, 0)

  const [attendance, attendanceTrend, inboundPlanTrend, personnelDetail] = await Promise.allSettled([
    loadAttendanceCard(department, processTypes, config, refreshedAt),
    loadAttendanceTrendCard(department, processTypes),
    loadInboundPlanTrendCard(processTypes),
    loadPersonnelDetailCard(department, processTypes, config, refreshedAt),
  ])

  const result: DepartmentDashboardData = {
    ...fallback,
    attendance: attendance.status === 'fulfilled' ? attendance.value : fallback.attendance,
    attendanceTrend: attendanceTrend.status === 'fulfilled' ? attendanceTrend.value : fallback.attendanceTrend,
    inboundPlanTrend: inboundPlanTrend.status === 'fulfilled' ? inboundPlanTrend.value : fallback.inboundPlanTrend,
    personnelDetail: personnelDetail.status === 'fulfilled' ? personnelDetail.value : fallback.personnelDetail,
  }

  writeCache(cacheKey, result)
  return result
}
