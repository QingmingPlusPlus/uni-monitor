import type { SegmentVO } from '../../../../api/basic'
import { getProcessSegments } from '../../../../utils/monthSegment'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { TableColumnConfig } from '../../../../components/table-chart-card/TableChartCard.types'
import {
  getCurrentDayOfMonth,
  getCurrentMonthNumber,
  getLastDayOfCurrentMonth,
  isWeekendDayOfCurrentMonth,
} from './dateTimeUtils'
import { toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'

export type TrendPeriodKind = 'month' | 'week' | 'day'

export interface TrendPeriod {
  readonly kind: TrendPeriodKind
  readonly key: string
  readonly label: string
  readonly day?: number
  readonly segmentIndex?: number
}

export interface TrendPeriods {
  readonly inlinePeriods: readonly TrendPeriod[]
  readonly modalPeriods: readonly TrendPeriod[]
  readonly segmentGroups: readonly (readonly SegmentVO[])[]
}

export interface DailyProcessRow {
  readonly processType: string
  readonly day: number
}

export function createTrendColumn(period: TrendPeriod, isModal: boolean): TableColumnConfig {
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

export function createTrendColumns(
  periods: readonly TrendPeriod[],
  isModal: boolean,
): readonly TableColumnConfig[] {
  return periods.map((period) => createTrendColumn(period, isModal))
}

function createWeekKey(segmentIndex: number): string {
  return `week${segmentIndex}`
}

export function resolveProcessSegments(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
): readonly (readonly SegmentVO[])[] | null {
  const departmentCode = toApiDepartmentCode(department)
  const segmentGroups: (readonly SegmentVO[])[] = []
  for (const processType of processTypes) {
    const segments = getProcessSegments(departmentCode, toApiProcessType(processType))
    if (segments === null) return null
    segmentGroups.push(segments)
  }
  return segmentGroups
}

export function createTrendPeriods(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
): TrendPeriods | null {
  const segmentGroups = resolveProcessSegments(department, processTypes)
  if (segmentGroups === null) return null

  const lastDayOfMonth = getLastDayOfCurrentMonth()
  const currentDay = Math.min(getCurrentDayOfMonth(), lastDayOfMonth)
  const monthLabel = `${getCurrentMonthNumber()}月`
  const maxSegmentIndex = segmentGroups.reduce(
    (max, segments) => Math.max(max, ...segments.map((segment) => segment.segmentIndex)),
    0,
  )
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
  const currentSegment = primarySegments.find(
    (segment) => currentDay >= segment.startDay && currentDay <= segment.endDay,
  )
  const currentWeekDayStart = currentSegment?.startDay ?? currentDay
  const currentWeekDayEnd = Math.min(currentSegment?.endDay ?? currentDay, lastDayOfMonth)
  const currentWeekDayPeriods: TrendPeriod[] = Array.from(
    { length: Math.max(0, currentWeekDayEnd - currentWeekDayStart + 1) },
    (_, index) => {
      const day = currentWeekDayStart + index
      return { kind: 'day' as const, key: `day${day}`, label: String(day), day }
    },
  ).filter((period) => period.day !== undefined && !isWeekendDayOfCurrentMonth(period.day))
  const allDayPeriods: TrendPeriod[] = Array.from({ length: lastDayOfMonth }, (_, index) => {
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

export function getRowsForPeriod<TDailyRow extends DailyProcessRow>(
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
    return rows.filter(
      (row) =>
        row.processType === processType &&
        row.day >= segment.startDay &&
        row.day <= segment.endDay,
    )
  })
}
