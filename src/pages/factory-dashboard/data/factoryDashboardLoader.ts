import {
  getAttendanceDetailSituation,
  getAttendanceSituation,
  getMonthlyAttendanceSituation,
} from '../../../api/attendance'
import { getDeviceRealtimeList } from '../../../api/deviceRealtime'
import type { DeviceRealtimeItem } from '../../../api/deviceRealtime'
import {
  getScheduleDeviceLoadByMonth,
  getScheduleOutputByMonth,
  getSchedulePlanByMonth,
  getScheduleRukuPlanByMonth,
} from '../../../api/schedule'
import type { SegmentVO } from '../../../api/basic'
import type { AttendanceDetailSituationVO } from '../../../api/attendance'
import type { CurrentAttendanceStatisticsVO } from '../../../api/attendance'
import type {
  ScheduleDeviceLoadRecord,
  ScheduleMonthlyRecord,
  ScheduleRukuPlanRecord,
} from '../../../api/schedule'
import type {
  CssMapDepartmentValue,
  CssMapJsonConfig,
  CssMapJsonDevice,
  CssMapJsonDeviceChild,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../components/css-map/css3dMapTypes'
import {
  getCssMapDepartmentLabel,
  getCssMapProcessLabel,
} from '../../../components/css-map/css3dMapSelection'
import type { AttendanceTrendDailyRow } from '../../../components/attendance-trend-card/attendanceTrendMock'
import {
  attendanceTrendChartOptions,
  attendanceTrendRows,
} from '../../../components/attendance-trend-card/attendanceTrendConfig'
import {
  departmentInboundPlanTrendChartOptions,
  departmentInboundPlanTrendRows,
} from '../../../components/department-inbound-plan-trend-card/departmentInboundPlanTrendConfig'
import {
  processProductionPlanTrendChartOptions,
  processProductionPlanTrendRows,
} from '../../../components/process-production-plan-trend-card/processProductionPlanTrendMock'
import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableCellValue,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from '../../../components/table-chart-card/TableChartCard.types'
import { getProcessSegments } from '../../../utils/monthSegment'
import type {
  DepartmentDashboardData,
  FactoryDashboardCard,
  FactorySummaryData,
  ProcessDashboardData,
  ProductionActivityData,
  ProductionActivityRow,
} from './factoryDashboardTypes'
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
export function toApiDepartmentCode(value: CssMapDepartmentValue): string {
  return value.replace('department', '')
}

/** CssMapProcessValue → API 工序类型 ('preprocessing' | 'sulfur_addition' | 'post_processing') */
export function toApiProcessType(value: CssMapProcessValue): string {
  const prefix = value.replace(/[0-9]+$/u, '')
  const map: Readonly<Record<string, string>> = {
    pretreatment: 'preprocessing',
    vulcanization: 'sulfur_addition',
    posttreatment: 'post_processing',
  }
  return map[prefix] ?? prefix
}

function toApiProcessLabel(value: CssMapProcessValue): string {
  const map: Readonly<Record<string, string>> = {
    preprocessing: '前处理',
    sulfur_addition: '加硫',
    post_processing: '后处理',
  }

  return map[toApiProcessType(value)] ?? ''
}

function getCurrentMonthParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentDateParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getCurrentMonthNumber(): number {
  return new Date().getMonth() + 1
}

function getCurrentDayOfMonth(): number {
  return new Date().getDate()
}

function getLastDayOfCurrentMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
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
// 地图设备范围：用于把真实接口里的设备编码过滤到当前部门/工序
// ---------------------------------------------------------------------------

const factoryMapConfigUrls = [
  '/static/factory-map/devices.json',
  '/factory-map/devices.json',
] as const

type ProcessDeviceCodeMap = Readonly<Record<string, ReadonlySet<string>>>

let deviceCodeMapPromise: Promise<ProcessDeviceCodeMap> | null = null

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCssMapJsonDeviceChild(value: unknown): value is CssMapJsonDeviceChild {
  return (
    isRecord(value) &&
    typeof value.deviceCode === 'string'
  )
}

function isCssMapJsonDevice(value: unknown): value is CssMapJsonDevice {
  return (
    isRecord(value) &&
    (value.section === null || typeof value.section === 'string') &&
    (value.deviceCode === undefined || typeof value.deviceCode === 'string') &&
    (value.deviceCodes === undefined || (Array.isArray(value.deviceCodes) && value.deviceCodes.every((code) => typeof code === 'string'))) &&
    (value.children === undefined || (Array.isArray(value.children) && value.children.every(isCssMapJsonDeviceChild)))
  )
}

function isCssMapJsonConfig(value: unknown): value is CssMapJsonConfig {
  return isRecord(value) && Array.isArray(value.devices) && value.devices.every(isCssMapJsonDevice)
}

function normalizeDeviceCode(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function addDeviceCode(set: Set<string>, code: string | null | undefined): void {
  const normalized = normalizeDeviceCode(code)
  if (!normalized) return
  set.add(normalized)
}

function collectDeviceCodes(device: CssMapJsonDevice): readonly string[] {
  const codes = new Set<string>()
  addDeviceCode(codes, device.deviceCode)
  device.deviceCodes?.forEach((code) => addDeviceCode(codes, code))
  device.children?.forEach((child) => addDeviceCode(codes, child.deviceCode))
  return [...codes]
}

async function fetchFactoryMapConfig(url: string): Promise<CssMapJsonConfig> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`地图设备配置加载失败: ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!isCssMapJsonConfig(payload)) {
    throw new Error('地图设备配置格式不正确')
  }

  return payload
}

async function loadFactoryMapConfig(): Promise<CssMapJsonConfig> {
  const errors: string[] = []
  for (const url of factoryMapConfigUrls) {
    try {
      return await fetchFactoryMapConfig(url)
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join(' | '))
}

function createProcessDeviceCodeMap(config: CssMapJsonConfig): ProcessDeviceCodeMap {
  const map: Record<string, Set<string>> = {}
  for (const device of config.devices) {
    if (typeof device.section !== 'string') continue
    const set = map[device.section] ?? new Set<string>()
    collectDeviceCodes(device).forEach((code) => set.add(code))
    map[device.section] = set
  }

  return map
}

async function loadProcessDeviceCodeMap(): Promise<ProcessDeviceCodeMap> {
  if (deviceCodeMapPromise !== null) return deviceCodeMapPromise

  deviceCodeMapPromise = loadFactoryMapConfig()
    .then(createProcessDeviceCodeMap)
    .catch((error: unknown) => {
      if (error instanceof Error) {
        console.warn(`[DashboardLoader] 地图设备范围加载失败: ${error.message}`)
      }
      return {}
    })

  return deviceCodeMapPromise
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

function averageBy<T>(items: readonly T[], selector: (item: T) => number): number | null {
  if (items.length === 0) return null
  return items.reduce((total, item) => total + selector(item), 0) / items.length
}

function formatInteger(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function formatOneDecimalPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)}%`
}

function formatRatioValue(actual: number | null | undefined, plan: number | null | undefined): string {
  if (typeof actual !== 'number' || typeof plan !== 'number') return '-'
  return `${formatInteger(actual)}/${formatInteger(plan)}`
}

function calculateRate(actual: number | null | undefined, plan: number | null | undefined): number | null {
  if (typeof actual !== 'number' || typeof plan !== 'number' || plan === 0) return null
  return Number(((actual / plan) * 100).toFixed(1))
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
  if (shiftType.includes('夜') || shiftType.includes('night')) return 'night'
  if (shiftType.includes('早') || shiftType.includes('白') || shiftType.includes('early') || shiftType.includes('day')) return 'day'
  return 'regular'
}

function voShiftLabel(shiftType: string): string {
  if (shiftType.includes('夜') || shiftType.includes('night')) return '夜班'
  if (shiftType.includes('早') || shiftType.includes('白') || shiftType.includes('early') || shiftType.includes('day')) return '早班'
  return shiftType || '正常班'
}

function getAttendanceShiftText(vo: CurrentAttendanceStatisticsVO): string {
  return vo.shiftTypeName || vo.shiftType || ''
}

function sumDirectPosition(
  positions: readonly CurrentAttendanceStatisticsVO[],
  matcher: (positionName: string) => boolean,
): number {
  return sumBy(
    positions.filter((position) => matcher(position.positionName ?? '')),
    (position) => position.schedulePersonCount,
  )
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
    const shiftKey = getAttendanceShiftText(vo)
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
    const directTeamLeader = sumDirectPosition(directPositions, (name) => name.includes('班长') || name.includes('组长'))
    const directDispatched = sumDirectPosition(directPositions, (name) => name.includes('派遣'))
    const directTemporary = sumDirectPosition(directPositions, (name) => name.includes('临时'))
    const directStandby = sumDirectPosition(directPositions, (name) => name.includes('顶岗'))
    const knownDirectRoster = directTeamLeader + directDispatched + directTemporary + directStandby

    rows.push({
      id: `${shiftType}-detail`,
      shift,
      shiftLabel,
      indirectDirectRoster,
      indirectLeaderRoster: 0,
      indirectLeaderAttendance,
      directTeamLeader,
      directRegular: Math.max(0, directRosterTotal - knownDirectRoster),
      directDispatched,
      directTemporary,
      directStandby,
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
// 推移表通用列与聚合
// ---------------------------------------------------------------------------

type TrendPeriodKind = 'month' | 'week' | 'day'

interface TrendPeriod {
  readonly kind: TrendPeriodKind
  readonly key: string
  readonly label: string
  readonly day?: number
  readonly segmentIndex?: number
}

interface TrendPeriods {
  readonly inlinePeriods: readonly TrendPeriod[]
  readonly modalPeriods: readonly TrendPeriod[]
  readonly segmentGroups: readonly (readonly SegmentVO[])[]
}

interface DailyProcessRow {
  readonly processType: string
  readonly day: number
}

const percentFormatter = (value: TableCellValue): string => {
  if (typeof value === 'number') return `${value.toFixed(1)}%`
  if (typeof value === 'string') return value
  return '-'
}

function createTrendColumn(period: TrendPeriod, isModal: boolean): TableColumnConfig {
  if (period.kind === 'month') {
    return {
      key: period.key,
      label: period.label,
      width: isModal ? 'minmax(96px, 112px)' : 'minmax(68px, 0.9fr)',
    }
  }

  if (period.kind === 'day') {
    return {
      key: period.key,
      label: period.label,
      width: isModal ? 'minmax(64px, 72px)' : 'minmax(42px, 0.72fr)',
    }
  }

  return {
    key: period.key,
    label: period.label,
    width: isModal ? 'minmax(64px, 72px)' : 'minmax(44px, 0.78fr)',
  }
}

function createTrendColumns(periods: readonly TrendPeriod[], isModal: boolean): readonly TableColumnConfig[] {
  return periods.map((period) => createTrendColumn(period, isModal))
}

function createWeekKey(segmentIndex: number): string {
  return `week${segmentIndex}`
}

function resolveProcessSegments(processTypes: readonly CssMapProcessValue[]): readonly (readonly SegmentVO[])[] | null {
  const segmentGroups: (readonly SegmentVO[])[] = []
  for (const processType of processTypes) {
    const segments = getProcessSegments(processType)
    if (segments === null) return null
    segmentGroups.push(segments)
  }
  return segmentGroups
}

function createTrendPeriods(processTypes: readonly CssMapProcessValue[]): TrendPeriods | null {
  const segmentGroups = resolveProcessSegments(processTypes)
  if (segmentGroups === null) return null

  const currentDay = Math.min(getCurrentDayOfMonth(), getLastDayOfCurrentMonth())
  const monthLabel = `${getCurrentMonthNumber()}月`
  const maxSegmentIndex = segmentGroups.reduce((max, segments) => (
    Math.max(max, ...segments.map((segment) => segment.segmentIndex))
  ), 0)
  const weekPeriods: TrendPeriod[] = Array.from({ length: maxSegmentIndex }, (_, index) => {
    const segmentIndex = index + 1
    return {
      kind: 'week',
      key: createWeekKey(segmentIndex),
      label: `${segmentIndex}W`,
      segmentIndex,
    }
  })

  const primarySegments = segmentGroups[0] ?? []
  const currentSegment = primarySegments.find((segment) => (
    currentDay >= segment.startDay && currentDay <= segment.endDay
  ))
  const currentWeekDayStart = currentSegment?.startDay ?? currentDay
  const currentWeekDayEnd = Math.min(currentSegment?.endDay ?? currentDay, currentDay)
  const currentWeekDayPeriods: TrendPeriod[] = Array.from(
    { length: Math.max(0, currentWeekDayEnd - currentWeekDayStart + 1) },
    (_, index) => {
      const day = currentWeekDayStart + index
      return { kind: 'day', key: `day${day}`, label: String(day), day }
    },
  )
  const allDayPeriods: TrendPeriod[] = Array.from({ length: getLastDayOfCurrentMonth() }, (_, index) => {
    const day = index + 1
    return { kind: 'day', key: `day${day}`, label: String(day), day }
  })
  const monthPeriod: TrendPeriod = { kind: 'month', key: 'month', label: monthLabel }

  return {
    inlinePeriods: [monthPeriod, ...weekPeriods, ...currentWeekDayPeriods],
    modalPeriods: [monthPeriod, ...weekPeriods, ...allDayPeriods],
    segmentGroups,
  }
}

function getRowsForPeriod<TDailyRow extends DailyProcessRow>(
  rows: readonly TDailyRow[],
  processTypes: readonly CssMapProcessValue[],
  segmentGroups: readonly (readonly SegmentVO[])[],
  period: TrendPeriod,
): readonly TDailyRow[] {
  const processTypeSet = new Set<string>(processTypes)

  if (period.kind === 'month') {
    return rows.filter((row) => processTypeSet.has(row.processType))
  }

  if (period.kind === 'day') {
    return rows.filter((row) => processTypeSet.has(row.processType) && row.day === period.day)
  }

  return processTypes.flatMap((processType, processIndex) => {
    const segment = segmentGroups[processIndex]?.find((item) => item.segmentIndex === period.segmentIndex)
    if (segment === undefined) return []
    return rows.filter((row) => (
      row.processType === processType &&
      row.day >= segment.startDay &&
      row.day <= segment.endDay
    ))
  })
}

// ---------------------------------------------------------------------------
// #2 出勤率推移适配：MonthlyAttendanceStatisticsVO[] → 月/周/日展示
// ---------------------------------------------------------------------------

interface AttendancePeriodValue {
  readonly indirectCount: number | null
  readonly directCount: number | null
  readonly directAttendance: number | null
  readonly directRate: number | null
}

function aggregateAttendancePeriod(rows: readonly AttendanceTrendDailyRow[]): AttendancePeriodValue {
  const validRows = rows.filter((row) => (
    row.indirectCount > 0 || row.directCount > 0 || row.directAttendance > 0
  ))

  if (validRows.length === 0) {
    return {
      indirectCount: null,
      directCount: null,
      directAttendance: null,
      directRate: null,
    }
  }

  const directCountSum = sumBy(validRows, (row) => row.directCount)
  const directAttendanceSum = sumBy(validRows, (row) => row.directAttendance)

  return {
    indirectCount: averageBy(validRows, (row) => row.indirectCount),
    directCount: averageBy(validRows, (row) => row.directCount),
    directAttendance: averageBy(validRows, (row) => row.directAttendance),
    directRate: directCountSum > 0 ? (directAttendanceSum / directCountSum) * 100 : null,
  }
}

function createAttendanceTrendTableData(
  periods: readonly TrendPeriod[],
  periodValues: Readonly<Record<string, AttendancePeriodValue>>,
): TableData {
  const indirectCount: Record<string, TableCellValue> = {}
  const directCount: Record<string, TableCellValue> = {}
  const directAttendance: Record<string, TableCellValue> = {}
  const directRate: Record<string, TableCellValue> = {}
  const targetRate: Record<string, TableCellValue> = {}

  for (const period of periods) {
    const value = periodValues[period.key]
    indirectCount[period.key] = value?.indirectCount ?? null
    directCount[period.key] = value?.directCount ?? null
    directAttendance[period.key] = value?.directAttendance ?? null
    directRate[period.key] = value?.directRate ?? null
    targetRate[period.key] = period.key === 'month' ? 91 : null
  }

  return {
    indirectCount,
    directCount,
    directAttendance,
    directRate,
    targetRate,
  }
}

function createAttendanceTrendChartData(
  periods: readonly TrendPeriod[],
  tableData: TableData,
): ChartDataConfig {
  const keys = periods.map((period) => period.key)

  return {
    xAxisData: periods.map((period) => period.label),
    series: [
      { id: 'directCount', data: keys.map((key) => tableData.directCount?.[key] ?? null) },
      { id: 'directAttendance', data: keys.map((key) => tableData.directAttendance?.[key] ?? null) },
      { id: 'indirectCount', data: keys.map((key) => tableData.indirectCount?.[key] ?? null) },
      { id: 'directRate', data: keys.map((key) => tableData.directRate?.[key] ?? null) },
      { id: 'targetRate', data: keys.map(() => 91) },
    ],
  }
}

function createAttendanceTrendRows(): readonly TableRowConfig[] {
  return attendanceTrendRows.map((row) => (
    row.key === 'targetRate'
      ? { ...row, formatter: percentFormatter }
      : row
  ))
}

function createAttendanceTrendCard(
  processTypes: readonly CssMapProcessValue[],
  dailyRows: readonly AttendanceTrendDailyRow[],
): FactoryDashboardCard | null {
  const periods = createTrendPeriods(processTypes)
  if (periods === null) return null

  const allPeriods = [...periods.inlinePeriods, ...periods.modalPeriods]
  const periodValues: Record<string, AttendancePeriodValue> = {}
  for (const period of allPeriods) {
    periodValues[period.key] = aggregateAttendancePeriod(
      getRowsForPeriod(dailyRows, processTypes, periods.segmentGroups, period),
    )
  }

  const tableRows = createAttendanceTrendRows()
  const tableData = createAttendanceTrendTableData(periods.inlinePeriods, periodValues)
  const modalTableData = createAttendanceTrendTableData(periods.modalPeriods, periodValues)

  return {
    id: 'attendance-trend',
    title: '出勤率推移表',
    subtitle: '按月、周及当前周日别汇总人员出勤情况',
    tableRows,
    tableColumns: createTrendColumns(periods.inlinePeriods, false),
    tableData,
    chartOptions: attendanceTrendChartOptions,
    chartData: createAttendanceTrendChartData(periods.inlinePeriods, tableData),
    modalTableRows: tableRows,
    modalTableColumns: createTrendColumns(periods.modalPeriods, true),
    modalTableData,
    modalChartOptions: attendanceTrendChartOptions,
    modalChartData: createAttendanceTrendChartData(periods.modalPeriods, modalTableData),
  }
}

/**
 * 出勤率推移适配：按 processTypes[] 多次调用 getMonthlyAttendanceSituation，
 * 后端按日返回，前端按当前月分段配置汇总为月/周/日。
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
            targetRate: 91,
          })
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(`[DepartmentLoader] 出勤率推移接口失败 (${processId}): ${error.message}`)
        }
      }
    }),
  )

  return createAttendanceTrendCard(processTypes, dailyRows)
}

// ---------------------------------------------------------------------------
// #3 入库 / 生产计划实绩推移：Schedule*Record[] → 月/周/日展示
// ---------------------------------------------------------------------------

interface FlowDailyRow extends DailyProcessRow {
  readonly plan: number | null
  readonly actual: number | null
}

interface FlowPeriodValue {
  readonly plan: number | null
  readonly actual: number | null
  readonly gap: number | null
  readonly rate: number | null
}

interface ScheduleScope {
  readonly department: CssMapDepartmentValue
  readonly processTypes: readonly CssMapProcessValue[]
  readonly deviceCodeMap: ProcessDeviceCodeMap
}

const schedulePlanCache = new Map<string, Promise<readonly ScheduleMonthlyRecord[]>>()
const scheduleOutputCache = new Map<string, Promise<readonly ScheduleMonthlyRecord[]>>()
const scheduleRukuPlanCache = new Map<string, Promise<readonly ScheduleRukuPlanRecord[]>>()
const scheduleLoadCache = new Map<string, Promise<readonly ScheduleDeviceLoadRecord[]>>()

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

function loadSchedulePlanRecords(month: string): Promise<readonly ScheduleMonthlyRecord[]> {
  return getCachedScheduleRecords(schedulePlanCache, month, () =>
    readScheduleRecords(() => getSchedulePlanByMonth(month), '生产计划'))
}

function loadScheduleOutputRecords(month: string): Promise<readonly ScheduleMonthlyRecord[]> {
  return getCachedScheduleRecords(scheduleOutputCache, month, () =>
    readScheduleRecords(() => getScheduleOutputByMonth(month), '生产实绩'))
}

function loadScheduleRukuPlanRecords(month: string): Promise<readonly ScheduleRukuPlanRecord[]> {
  return getCachedScheduleRecords(scheduleRukuPlanCache, month, () =>
    readScheduleRecords(() => getScheduleRukuPlanByMonth(month), '入库计划'))
}

function loadScheduleLoadRecords(month: string): Promise<readonly ScheduleDeviceLoadRecord[]> {
  return getCachedScheduleRecords(scheduleLoadCache, month, () =>
    readScheduleRecords(() => getScheduleDeviceLoadByMonth(month), '设备负荷'))
}

function recordMatchesProcess(record: ScheduleMonthlyRecord, processType: CssMapProcessValue, scope: ScheduleScope): boolean {
  const codeSet = scope.deviceCodeMap[processType]
  const normalizedCode = normalizeDeviceCode(record.shebei)

  if (codeSet !== undefined && codeSet.size > 0) {
    return codeSet.has(normalizedCode)
  }

  return record.dept === Number(toApiDepartmentCode(scope.department)) && record.process === toApiProcessLabel(processType)
}

function filterScheduleRecordsForScope(
  records: readonly ScheduleMonthlyRecord[],
  scope: ScheduleScope,
): readonly (ScheduleMonthlyRecord & { readonly processType: CssMapProcessValue })[] {
  const matched: (ScheduleMonthlyRecord & { readonly processType: CssMapProcessValue })[] = []

  for (const record of records) {
    if (record.dept !== Number(toApiDepartmentCode(scope.department))) continue

    const processType = scope.processTypes.find((item) => recordMatchesProcess(record, item, scope))
    if (processType === undefined) continue
    matched.push({ ...record, processType })
  }

  return matched
}

function createDailyFlowRows(
  processTypes: readonly CssMapProcessValue[],
  planRecords: readonly (ScheduleMonthlyRecord & { readonly processType: CssMapProcessValue })[],
  actualRecords: readonly (ScheduleMonthlyRecord & { readonly processType: CssMapProcessValue })[],
): readonly FlowDailyRow[] {
  const rowMap = new Map<string, { processType: CssMapProcessValue; day: number; plan: number | null; actual: number | null }>()

  function getRow(processType: CssMapProcessValue, day: number) {
    const key = `${processType}:${day}`
    const row = rowMap.get(key) ?? { processType, day, plan: null, actual: null }
    rowMap.set(key, row)
    return row
  }

  for (const record of planRecords) {
    if (!processTypes.includes(record.processType)) continue
    const row = getRow(record.processType, extractDayFromDate(record.date))
    row.plan = (row.plan ?? 0) + (record.number ?? 0)
  }

  for (const record of actualRecords) {
    if (!processTypes.includes(record.processType)) continue
    const row = getRow(record.processType, extractDayFromDate(record.date))
    row.actual = (row.actual ?? 0) + (record.number ?? 0)
  }

  return [...rowMap.values()]
}

function aggregateFlowPeriod(rows: readonly FlowDailyRow[]): FlowPeriodValue {
  const planRows = rows.filter((row) => typeof row.plan === 'number')
  const actualRows = rows.filter((row) => typeof row.actual === 'number')
  const plan = planRows.length > 0 ? sumBy(planRows, (row) => row.plan ?? 0) : null
  const actual = actualRows.length > 0 ? sumBy(actualRows, (row) => row.actual ?? 0) : null
  const gap = typeof plan === 'number' && typeof actual === 'number' ? actual - plan : null
  const rate = calculateRate(actual, plan)

  return { plan, actual, gap, rate }
}

function createFlowTableData(
  periods: readonly TrendPeriod[],
  periodValues: Readonly<Record<string, FlowPeriodValue>>,
  keys: { readonly plan: string; readonly actual: string; readonly gap: string; readonly rate: string },
): TableData {
  const plan: Record<string, TableCellValue> = {}
  const actual: Record<string, TableCellValue> = {}
  const gap: Record<string, TableCellValue> = {}
  const rate: Record<string, TableCellValue> = {}

  for (const period of periods) {
    const value = periodValues[period.key]
    plan[period.key] = value?.plan ?? null
    actual[period.key] = value?.actual ?? null
    gap[period.key] = value?.gap ?? null
    rate[period.key] = value?.rate ?? null
  }

  return {
    [keys.plan]: plan,
    [keys.actual]: actual,
    [keys.gap]: gap,
    [keys.rate]: rate,
  }
}

function createFlowChartData(
  periods: readonly TrendPeriod[],
  tableData: TableData,
  keys: { readonly plan: string; readonly actual: string; readonly rate: string },
): ChartDataConfig {
  const periodKeys = periods.map((period) => period.key)

  return {
    xAxisData: periods.map((period) => period.label),
    series: [
      { id: keys.plan, data: periodKeys.map((key) => tableData[keys.plan]?.[key] ?? null) },
      { id: keys.actual, data: periodKeys.map((key) => tableData[keys.actual]?.[key] ?? null) },
      { id: keys.rate, data: periodKeys.map((key) => tableData[keys.rate]?.[key] ?? null) },
    ],
  }
}

function cloneRowsWithPercent(
  rows: readonly TableRowConfig[],
  rateKey: string,
): readonly TableRowConfig[] {
  return rows.map((row) => (
    row.key === rateKey ? { ...row, formatter: percentFormatter } : row
  ))
}

function createProductionPlanTrendChartOptions(): ChartOptionConfig {
  return {
    ...processProductionPlanTrendChartOptions,
    yAxis: [
      processProductionPlanTrendChartOptions.yAxis,
      {
        type: 'value',
        min: 0,
        max: 120,
        interval: 20,
        axisLabel: {
          color: '#566579',
          fontSize: 12,
          formatter: '{value}%',
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      ...(processProductionPlanTrendChartOptions.series ?? []),
      {
        id: 'achievementRate',
        name: '生产达成率',
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        yAxisIndex: 1,
      },
    ],
  }
}

function createFlowTrendCard(params: {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly processTypes: readonly CssMapProcessValue[]
  readonly dailyRows: readonly FlowDailyRow[]
  readonly tableRows: readonly TableRowConfig[]
  readonly chartOptions: ChartOptionConfig
  readonly keys: { readonly plan: string; readonly actual: string; readonly gap: string; readonly rate: string }
}): FactoryDashboardCard | null {
  const periods = createTrendPeriods(params.processTypes)
  if (periods === null) return null

  const allPeriods = [...periods.inlinePeriods, ...periods.modalPeriods]
  const periodValues: Record<string, FlowPeriodValue> = {}
  for (const period of allPeriods) {
    periodValues[period.key] = aggregateFlowPeriod(
      getRowsForPeriod(params.dailyRows, params.processTypes, periods.segmentGroups, period),
    )
  }

  const tableRows = cloneRowsWithPercent(params.tableRows, params.keys.rate)
  const tableData = createFlowTableData(periods.inlinePeriods, periodValues, params.keys)
  const modalTableData = createFlowTableData(periods.modalPeriods, periodValues, params.keys)

  return {
    id: params.id,
    title: params.title,
    subtitle: params.subtitle,
    tableRows,
    tableColumns: createTrendColumns(periods.inlinePeriods, false),
    tableData,
    chartOptions: params.chartOptions,
    chartData: createFlowChartData(periods.inlinePeriods, tableData, params.keys),
    modalTableRows: tableRows,
    modalTableColumns: createTrendColumns(periods.modalPeriods, true),
    modalTableData,
    modalChartOptions: params.chartOptions,
    modalChartData: createFlowChartData(periods.modalPeriods, modalTableData, params.keys),
  }
}

export async function loadInboundPlanTrendCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
): Promise<FactoryDashboardCard | null> {
  if (processTypes.length === 0) return null

  const month = getCurrentMonthParam()
  const records = await loadScheduleRukuPlanRecords(month)
  const bucketProcessType = processTypes[0]
  const dailyRows: FlowDailyRow[] = records.map((record) => ({
    processType: bucketProcessType,
    day: extractDayFromDate(record.date),
    plan: record.number ?? 0,
    actual: null,
  }))

  void department

  return createFlowTrendCard({
    id: 'department-inbound-plan-trend',
    title: '入库计划实绩推移表',
    subtitle: '按月、周及当前周日别汇总入库计划；实绩字段后端未提供',
    processTypes: [bucketProcessType],
    dailyRows,
    tableRows: departmentInboundPlanTrendRows,
    chartOptions: departmentInboundPlanTrendChartOptions,
    keys: {
      plan: 'planInbound',
      actual: 'actualInbound',
      gap: 'gap',
      rate: 'achievementRate',
    },
  })
}

export async function loadProductionPlanTrendCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
): Promise<FactoryDashboardCard | null> {
  if (processTypes.length === 0) return null

  const [deviceCodeMap, planRecords, actualRecords] = await Promise.all([
    loadProcessDeviceCodeMap(),
    loadSchedulePlanRecords(getCurrentMonthParam()),
    loadScheduleOutputRecords(getCurrentMonthParam()),
  ])
  const scope: ScheduleScope = { department, processTypes, deviceCodeMap }
  const dailyRows = createDailyFlowRows(
    processTypes,
    filterScheduleRecordsForScope(planRecords, scope),
    filterScheduleRecordsForScope(actualRecords, scope),
  )
  const hasActual = dailyRows.some((row) => typeof row.actual === 'number')

  return createFlowTrendCard({
    id: 'process-production-plan-trend',
    title: '生产计划实绩推移表',
    subtitle: hasActual
      ? '按月、周及当前周日别汇总生产计划与实绩'
      : '按月、周及当前周日别汇总生产计划；当前月实绩接口暂无记录',
    processTypes,
    dailyRows,
    tableRows: [
      ...processProductionPlanTrendRows,
      { key: 'gap', label: '实绩-计划', tone: 'muted' },
      { key: 'achievementRate', label: '生产达成率', formatter: percentFormatter },
    ],
    chartOptions: createProductionPlanTrendChartOptions(),
    keys: {
      plan: 'plan',
      actual: 'actual',
      gap: 'gap',
      rate: 'achievementRate',
    },
  })
}

// ---------------------------------------------------------------------------
// 信息汇总与生产线稼动情况
// ---------------------------------------------------------------------------

function mapRealtimeStatusName(item: DeviceRealtimeItem): 'running' | 'abnormal' | 'plannedStop' | 'neutral' {
  const text = [
    item.actualStatus,
    item.actualStatusName,
    item.deviceStatus,
    item.deviceStatusName,
    item.deviceParseTypeName,
  ].join(' ').toLowerCase()

  if (text.includes('异常') || text.includes('故障') || text.includes('error') || text.includes('abnormal') || text.includes('fault')) {
    return 'abnormal'
  }

  if (text.includes('暂停') || text.includes('停止') || text.includes('pause') || text.includes('stop') || text.includes('not_running')) {
    return 'plannedStop'
  }

  if (text.includes('正常') || text.includes('运行') || text.includes('normal') || text.includes('running')) {
    return 'running'
  }

  return 'neutral'
}

async function loadRealtimeForProcess(
  department: CssMapDepartmentValue,
  processType: CssMapProcessValue,
  deviceCodeMap: ProcessDeviceCodeMap,
): Promise<readonly DeviceRealtimeItem[]> {
  try {
    const response = await getDeviceRealtimeList({
      departmentId: toApiDepartmentCode(department),
      processType: toApiProcessType(processType),
    })
    const data = Array.isArray(response.data?.data) ? response.data.data : []
    const codeSet = deviceCodeMap[processType]

    if (codeSet === undefined || codeSet.size === 0) {
      return data
    }

    const filtered = data.filter((item) => codeSet.has(normalizeDeviceCode(item.deviceCode)))
    return filtered.length > 0 ? filtered : data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DashboardLoader] 设备实时接口失败 (${processType}): ${error.message}`)
    }
    return []
  }
}

function createProductionActivityRow(
  department: CssMapDepartmentValue,
  processType: CssMapProcessValue,
  config: CssMapSelectionConfig,
  items: readonly DeviceRealtimeItem[],
  deviceCodeMap: ProcessDeviceCodeMap,
): ProductionActivityRow {
  const codeSet = deviceCodeMap[processType]
  const totalCount = Math.max(items.length, codeSet?.size ?? 0)
  const statuses = items.map(mapRealtimeStatusName)

  return {
    id: processType,
    departmentLabel: getCssMapDepartmentLabel(department, config),
    processLabel: getCssMapProcessLabel(processType, config),
    totalCount,
    runningCount: statuses.filter((status) => status === 'running').length,
    abnormalCount: statuses.filter((status) => status === 'abnormal').length,
    plannedStopCount: statuses.filter((status) => status === 'plannedStop').length,
  }
}

export async function loadProductionActivityData(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig,
): Promise<ProductionActivityData> {
  const deviceCodeMap = await loadProcessDeviceCodeMap()
  const rows = await Promise.all(
    processTypes.map(async (processType) => {
      const items = await loadRealtimeForProcess(department, processType, deviceCodeMap)
      return createProductionActivityRow(department, processType, config, items, deviceCodeMap)
    }),
  )

  return {
    title: '生产线稼动情况',
    rows,
  }
}

function getAttendanceTotals(data: PersonnelAttendanceData): {
  readonly directRoster: number
  readonly directAttendance: number
  readonly indirectRoster: number
  readonly indirectAttendance: number
} {
  const detailRows = data.groups.flatMap((group) =>
    group.rows.filter((row) => row.shift !== 'total'),
  )

  return {
    directRoster: sumBy(detailRows, (row) => row.directRosterTotal),
    directAttendance: sumBy(detailRows, (row) => row.actualAttendance),
    indirectRoster: sumBy(detailRows, (row) => row.indirectDirectRoster),
    indirectAttendance: sumBy(detailRows, (row) => row.indirectLeaderAttendance ?? 0),
  }
}

function getMonthlyFlowValues(
  card: FactoryDashboardCard | null,
  keys: { readonly plan: string; readonly actual: string },
): { readonly plan: number | null; readonly actual: number | null; readonly rate: number | null } {
  const plan = card?.tableData[keys.plan]?.month
  const actual = card?.tableData[keys.actual]?.month
  const numericPlan = typeof plan === 'number' ? plan : null
  const numericActual = typeof actual === 'number' ? actual : null

  return {
    plan: numericPlan,
    actual: numericActual,
    rate: calculateRate(numericActual, numericPlan),
  }
}

async function calculateAvailabilityRate(processTypes: readonly CssMapProcessValue[]): Promise<number | null> {
  const [deviceCodeMap, loadRecords] = await Promise.all([
    loadProcessDeviceCodeMap(),
    loadScheduleLoadRecords(getCurrentMonthParam()),
  ])
  const scopeCodes = new Set<string>()
  processTypes.forEach((processType) => {
    deviceCodeMap[processType]?.forEach((code) => scopeCodes.add(code))
  })

  const values = loadRecords
    .filter((record) => scopeCodes.size === 0 || scopeCodes.has(normalizeDeviceCode(record.devCode)))
    .map((record) => (record.fuhe <= 2 ? record.fuhe * 100 : record.fuhe))
    .filter((value) => Number.isFinite(value))

  return averageBy(values, (value) => value)
}

export async function createFactorySummaryData(params: {
  readonly activity: ProductionActivityData
  readonly attendance: PersonnelAttendanceData
  readonly inboundPlanTrend: FactoryDashboardCard | null
  readonly productionPlanTrend: FactoryDashboardCard | null
  readonly processTypes: readonly CssMapProcessValue[]
}): Promise<FactorySummaryData> {
  const running = sumBy(params.activity.rows, (row) => row.runningCount)
  const total = sumBy(params.activity.rows, (row) => row.totalCount)
  const attendance = getAttendanceTotals(params.attendance)
  const inbound = getMonthlyFlowValues(params.inboundPlanTrend, {
    plan: 'planInbound',
    actual: 'actualInbound',
  })
  const production = getMonthlyFlowValues(params.productionPlanTrend, {
    plan: 'plan',
    actual: 'actual',
  })
  const availabilityRate = await calculateAvailabilityRate(params.processTypes)

  return {
    title: '信息汇总',
    left: [
      {
        id: 'activity',
        label: '生产线稼动（台）',
        value: formatRatioValue(running, total),
        rate: formatOneDecimalPercent(calculateRate(running, total)),
      },
      {
        id: 'directAttendance',
        label: '直接',
        value: formatRatioValue(attendance.directAttendance, attendance.directRoster),
        rate: formatOneDecimalPercent(calculateRate(attendance.directAttendance, attendance.directRoster)),
        indent: true,
      },
      {
        id: 'indirectAttendance',
        label: '间接',
        value: formatRatioValue(attendance.indirectAttendance, attendance.indirectRoster),
        rate: formatOneDecimalPercent(calculateRate(attendance.indirectAttendance, attendance.indirectRoster)),
        indent: true,
      },
    ],
    right: [
      {
        id: 'inbound',
        label: '入库实绩（个）',
        value: formatRatioValue(inbound.actual, inbound.plan),
        rate: formatOneDecimalPercent(inbound.rate),
      },
      {
        id: 'production',
        label: '生产实际（个）',
        value: formatRatioValue(production.actual, production.plan),
        rate: formatOneDecimalPercent(production.rate),
      },
      {
        id: 'availability',
        label: '可动率（%）',
        value: '',
        rate: formatOneDecimalPercent(availabilityRate),
      },
    ],
  }
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
      inboundPlanTrend: resolvedInboundPlanTrend,
      productionPlanTrend: resolvedProductionPlanTrend,
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

  writeCache(cacheKey, result)
  return result
}

const PROCESS_CACHE_KEY_PREFIX = 'uni-monitor:process-dashboard:' as const
let processInflightPromise: Promise<ProcessDashboardData> | null = null
let processInflightKey = ''

function buildProcessCacheKey(processType: CssMapProcessValue, version: number): string {
  return `${PROCESS_CACHE_KEY_PREFIX}${processType}:v${version}`
}

interface ProcessCacheEntry {
  readonly data: ProcessDashboardData
  readonly timestamp: number
}

function isProcessCacheEntry(value: unknown): value is ProcessCacheEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ProcessCacheEntry).timestamp === 'number' &&
    typeof (value as ProcessCacheEntry).data === 'object' &&
    (value as ProcessCacheEntry).data !== null
  )
}

function readProcessCache(key: string): ProcessDashboardData | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isProcessCacheEntry(parsed)) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
    return parsed.data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[ProcessLoader] 缓存读取失败: ${error.message}`)
      return null
    }
    throw error
  }
}

function writeProcessCache(key: string, data: ProcessDashboardData): void {
  try {
    const entry: ProcessCacheEntry = { data, timestamp: Date.now() }
    window.sessionStorage.setItem(key, JSON.stringify(entry))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[ProcessLoader] 缓存写入失败: ${error.message}`)
      return
    }
    throw error
  }
}

export function invalidateProcessDashboardCache(
  processType: CssMapProcessValue,
  monthSegmentVersion: number,
): void {
  try {
    window.sessionStorage.removeItem(buildProcessCacheKey(processType, monthSegmentVersion))
    window.sessionStorage.removeItem(buildProcessCacheKey(processType, 0))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[ProcessLoader] 缓存清理失败: ${error.message}`)
    }
  }

  if (processInflightKey === buildProcessCacheKey(processType, monthSegmentVersion) || processInflightKey === buildProcessCacheKey(processType, 0)) {
    processInflightKey = ''
    processInflightPromise = null
  }
}

export async function loadProcessDashboardData(
  processType: CssMapProcessValue,
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
  monthSegmentVersion: number,
  fallback: ProcessDashboardData,
): Promise<ProcessDashboardData> {
  const cacheKey = buildProcessCacheKey(processType, monthSegmentVersion)
  const cached = readProcessCache(cacheKey)
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
  const cacheKey = buildProcessCacheKey(processType, 0)

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
      inboundPlanTrend: resolvedInboundPlanTrend,
      productionPlanTrend: resolvedProductionPlanTrend,
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

  writeProcessCache(cacheKey, result)
  return result
}
