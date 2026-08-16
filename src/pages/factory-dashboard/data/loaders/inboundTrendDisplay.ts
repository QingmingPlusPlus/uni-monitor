import type { SegmentVO } from '../../../../api/basic'
import type { CssMapProcessValue } from '../../../../components/css-map/css3dMapTypes'
import type {
  ChartDataConfig,
  ChartSeriesOption,
  TableCellValue,
  TableData,
} from '../../../../components/table-chart-card/TableChartCard.types'
import type { TrendPeriod, TrendPeriods } from './trendPeriodBuilder'

const DAYS_PER_INBOUND_WEEK = 7

export interface FlowChartKeys {
  readonly plan: string
  readonly actual: string
  readonly rate: string
}

export function createInboundMonthSegments(lastDayOfMonth: number): readonly SegmentVO[] {
  const segmentCount = Math.ceil(lastDayOfMonth / DAYS_PER_INBOUND_WEEK)

  return Array.from({ length: segmentCount }, (_, index) => {
    const segmentIndex = index + 1
    const startDay = index * DAYS_PER_INBOUND_WEEK + 1

    return {
      segmentIndex,
      startDay,
      endDay: Math.min(startDay + DAYS_PER_INBOUND_WEEK - 1, lastDayOfMonth),
    }
  })
}

export function createInboundTrendPeriods(
  processTypes: readonly CssMapProcessValue[],
  businessDate: Date = new Date(),
): TrendPeriods {
  const year = businessDate.getFullYear()
  const monthIndex = businessDate.getMonth()
  const monthNumber = monthIndex + 1
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()
  const currentDay = Math.min(Math.max(businessDate.getDate(), 1), lastDayOfMonth)
  const segments = createInboundMonthSegments(lastDayOfMonth)
  const weekPeriods: TrendPeriod[] = segments.map((segment) => ({
    kind: 'week',
    key: `week${segment.segmentIndex}`,
    label: `${segment.segmentIndex}W`,
    segmentIndex: segment.segmentIndex,
  }))
  const currentSegment = segments.find(
    (segment) => currentDay >= segment.startDay && currentDay <= segment.endDay,
  )
  const currentWeekDayPeriods: TrendPeriod[] = currentSegment === undefined
    ? []
    : Array.from(
        { length: currentSegment.endDay - currentSegment.startDay + 1 },
        (_, index) => {
          const day = currentSegment.startDay + index
          return { kind: 'day' as const, key: `day${day}`, label: String(day), day }
        },
      )
  const periods: readonly TrendPeriod[] = [
    { kind: 'month', key: 'month', label: `${monthNumber}月全月` },
    {
      kind: 'toDate',
      key: 'toDate',
      label: `${monthNumber}月截止${currentDay}日`,
      day: currentDay,
    },
    ...weekPeriods,
    ...currentWeekDayPeriods,
  ]
  const segmentGroups = processTypes.map(() => segments)

  return {
    inlinePeriods: periods,
    modalPeriods: periods,
    segmentGroups,
  }
}

function toInboundChartValue(value: TableCellValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function createProjectedSeries(
  periodKeys: readonly string[],
  tableData: TableData,
  id: string,
): ChartSeriesOption {
  return {
    id,
    data: periodKeys.map((key) => toInboundChartValue(tableData[id]?.[key])),
  }
}

function hasValidSeriesValue(series: ChartSeriesOption): boolean {
  return series.data?.some((value) => typeof value === 'number') ?? false
}

export function createInboundFlowChartData(
  periods: readonly TrendPeriod[],
  tableData: TableData,
  keys: FlowChartKeys,
): ChartDataConfig {
  const periodKeys = periods.map((period) => period.key)
  const series = [
    createProjectedSeries(periodKeys, tableData, keys.plan),
    createProjectedSeries(periodKeys, tableData, keys.actual),
    createProjectedSeries(periodKeys, tableData, keys.rate),
  ].filter(hasValidSeriesValue)

  if (series.length === 0) {
    return { xAxisData: [], series: [] }
  }

  const hasValueAtIndex = (index: number): boolean =>
    series.some((item) => typeof item.data?.[index] === 'number')
  const firstValidIndex = periods.findIndex((_, index) => hasValueAtIndex(index))
  let lastValidIndex = periods.length - 1
  while (lastValidIndex >= firstValidIndex && !hasValueAtIndex(lastValidIndex)) {
    lastValidIndex -= 1
  }

  return {
    xAxisData: periods
      .slice(firstValidIndex, lastValidIndex + 1)
      .map((period) => period.label),
    series: series.map((item) => ({
      ...item,
      data: item.data?.slice(firstValidIndex, lastValidIndex + 1),
    })),
  }
}
