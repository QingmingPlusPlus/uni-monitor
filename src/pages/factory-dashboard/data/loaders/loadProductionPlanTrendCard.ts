import type {
  ChartDataConfig,
  TableCellValue,
  TableData,
} from '../../../../components/table-chart-card/TableChartCard.types'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  getCssMapProcessLabel,
} from '../../../../components/css-map/css3dMapSelection'
import {
  createProductionPlanTrendChartOptions,
  createProductionPlanTrendRows,
  productionTrendMockBaseCapacity,
  productionTrendMockBaselineHeadcount,
  productionTrendMockDaySeeds,
  productionTrendMockShiftWeights,
  type ProductionTrendMockShift,
} from '../../../../components/process-production-plan-trend-card/processProductionPlanTrendMock'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { computeNaturalWeeks } from '../../../../utils/monthSegment'
import { getCurrentShiftCutoff, getLastDayOfCurrentMonth } from './dateTimeUtils'
import {
  createTrendColumns,
  createTrendPeriods,
  createTrendPeriodsFromSegmentGroups,
  getRowsForPeriod,
  type TrendPeriod,
} from './trendPeriodBuilder'

export type ProductionTrendMetricKey =
  | 'planCount'
  | 'actualCount'
  | 'planMh'
  | 'actualMh'
  | 'planProductivity'
  | 'actualProductivity'

export interface ProductionTrendMockShiftRow {
  readonly processType: CssMapProcessValue
  readonly day: number
  readonly dateKey: number
  readonly shift: ProductionTrendMockShift
  readonly planCount: number
  readonly actualCount: number | null
  readonly capacity: number
  readonly baselineHeadcount: number
  readonly actualMh: number | null
}

export interface ProductionTrendPeriodValue {
  readonly planCount: number | null
  readonly actualCount: number | null
  readonly planMh: number | null
  readonly actualMh: number | null
  readonly planProductivity: number | null
  readonly actualProductivity: number | null
}

interface ProcessPresentation {
  readonly quantityMultiplier: number
  readonly rowQuantityLabel: string
  readonly chartQuantityLabel: string
}

const metricKeys = [
  'planCount',
  'actualCount',
  'planMh',
  'actualMh',
  'planProductivity',
  'actualProductivity',
] as const satisfies readonly ProductionTrendMetricKey[]

const shiftSequence: Readonly<Record<ProductionTrendMockShift, number>> = {
  day: 0,
  middle: 1,
  night: 2,
}

function getProcessPresentation(processType: CssMapProcessValue): ProcessPresentation {
  if (processType.startsWith('pretreatment')) {
    return {
      quantityMultiplier: 1,
      rowQuantityLabel: '粘接数',
      chartQuantityLabel: '粘接数',
    }
  }

  if (processType.startsWith('vulcanization')) {
    return {
      quantityMultiplier: 4,
      rowQuantityLabel: '加硫数',
      chartQuantityLabel: '加硫数',
    }
  }

  return {
    quantityMultiplier: 2.5,
    rowQuantityLabel: '入库数（含待倒箱、端数等）',
    chartQuantityLabel: '入库数',
  }
}

function splitIntegerByShift(total: number): readonly number[] {
  let assigned = 0

  return productionTrendMockShiftWeights.map((item, index) => {
    if (index === productionTrendMockShiftWeights.length - 1) {
      return total - assigned
    }

    const value = Math.round(total * item.weight)
    assigned += value
    return value
  })
}

function splitDecimalByShift(total: number): readonly number[] {
  let assigned = 0

  return productionTrendMockShiftWeights.map((item, index) => {
    if (index === productionTrendMockShiftWeights.length - 1) {
      return total - assigned
    }

    const value = total * item.weight
    assigned += value
    return value
  })
}

function createCurrentMonthDateKey(day: number, now = new Date()): number {
  return now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + day
}

function isAtOrBeforeShiftCutoff(
  row: ProductionTrendMockShiftRow,
  cutoff = getCurrentShiftCutoff(),
): boolean {
  if (row.dateKey < cutoff.dateKey) return true
  if (row.dateKey > cutoff.dateKey) return false
  return shiftSequence[row.shift] <= shiftSequence[cutoff.shift]
}

export function createProductionTrendMockRows(
  processType: CssMapProcessValue,
): readonly ProductionTrendMockShiftRow[] {
  const presentation = getProcessPresentation(processType)
  const capacity = productionTrendMockBaseCapacity * presentation.quantityMultiplier
  const cutoff = getCurrentShiftCutoff()
  const rows: ProductionTrendMockShiftRow[] = []

  for (let day = 1; day <= getLastDayOfCurrentMonth(); day += 1) {
    const seed = productionTrendMockDaySeeds[(day - 1) % productionTrendMockDaySeeds.length]
    const dailyPlanCount = Math.round(seed.planCount * presentation.quantityMultiplier)
    const dailyActualCount = Math.round(seed.actualCount * presentation.quantityMultiplier)
    const planCounts = splitIntegerByShift(dailyPlanCount)
    const actualCounts = splitIntegerByShift(dailyActualCount)
    const actualMhValues = splitDecimalByShift(seed.actualDirectMh)
    const dateKey = createCurrentMonthDateKey(day)

    productionTrendMockShiftWeights.forEach((shiftItem, shiftIndex) => {
      const partialRow: ProductionTrendMockShiftRow = {
        processType,
        day,
        dateKey,
        shift: shiftItem.shift,
        planCount: planCounts[shiftIndex] ?? 0,
        actualCount: null,
        capacity,
        baselineHeadcount: productionTrendMockBaselineHeadcount,
        actualMh: null,
      }
      const hasActual = isAtOrBeforeShiftCutoff(partialRow, cutoff)

      rows.push({
        ...partialRow,
        actualCount: hasActual ? actualCounts[shiftIndex] ?? 0 : null,
        actualMh: hasActual ? actualMhValues[shiftIndex] ?? 0 : null,
      })
    })
  }

  return rows
}

function sumFinite(values: readonly (number | null)[]): number | null {
  const finiteValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  )
  return finiteValues.length > 0
    ? finiteValues.reduce((total, value) => total + value, 0)
    : null
}

function divideOrNull(numerator: number | null, denominator: number | null): number | null {
  if (
    typeof numerator !== 'number' ||
    !Number.isFinite(numerator) ||
    typeof denominator !== 'number' ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null
  }

  return numerator / denominator
}

function roundOneDecimal(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * 10) / 10
    : null
}

export function aggregateProductionTrendRows(
  rows: readonly ProductionTrendMockShiftRow[],
): ProductionTrendPeriodValue {
  const planCount = sumFinite(rows.map((row) => row.planCount))
  const actualCount = sumFinite(rows.map((row) => row.actualCount))
  const planMh = sumFinite(rows.map((row) => {
    if (!Number.isFinite(row.capacity) || row.capacity <= 0) return null
    if (!Number.isFinite(row.baselineHeadcount)) return null
    return row.planCount / row.capacity * row.baselineHeadcount
  }))
  const actualMh = sumFinite(rows.map((row) => row.actualMh))

  return {
    planCount: planCount === null ? null : Math.round(planCount),
    actualCount: actualCount === null ? null : Math.round(actualCount),
    planMh: roundOneDecimal(planMh),
    actualMh: roundOneDecimal(actualMh),
    planProductivity: roundOneDecimal(divideOrNull(planCount, planMh)),
    actualProductivity: roundOneDecimal(divideOrNull(actualCount, actualMh)),
  }
}

function createTableData(
  periods: readonly TrendPeriod[],
  periodValues: Readonly<Record<string, ProductionTrendPeriodValue>>,
): TableData {
  const tableData: Record<string, Record<string, TableCellValue>> = Object.fromEntries(
    metricKeys.map((key) => [key, {}]),
  )

  for (const period of periods) {
    const values = periodValues[period.key]
    for (const key of metricKeys) {
      tableData[key][period.key] = values?.[key] ?? null
    }
  }

  return tableData
}

function toThousands(value: TableCellValue): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value / 100) / 10
    : null
}

function toChartValue(value: TableCellValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function createChartData(
  periods: readonly TrendPeriod[],
  tableData: TableData,
): ChartDataConfig {
  const chartPeriods = periods.filter(
    (period) => period.kind !== 'month' && period.kind !== 'toDate',
  )
  const periodKeys = chartPeriods.map((period) => period.key)

  return {
    xAxisData: chartPeriods.map((period) => period.label),
    series: [
      {
        id: 'planCount',
        data: periodKeys.map((key) => toThousands(tableData.planCount?.[key])),
      },
      {
        id: 'actualCount',
        data: periodKeys.map((key) => toThousands(tableData.actualCount?.[key])),
      },
      {
        id: 'planProductivity',
        data: periodKeys.map((key) => toChartValue(tableData.planProductivity?.[key])),
      },
      {
        id: 'actualProductivity',
        data: periodKeys.map((key) => toChartValue(tableData.actualProductivity?.[key])),
      },
    ],
  }
}

export function createProductionPlanTrendCard(
  department: CssMapDepartmentValue,
  processType: CssMapProcessValue,
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): FactoryDashboardCard | null {
  const now = new Date()
  const periods = createTrendPeriods(department, [processType])
    ?? createTrendPeriodsFromSegmentGroups([
      computeNaturalWeeks(now.getFullYear(), now.getMonth() + 1),
    ])

  const presentation = getProcessPresentation(processType)
  const allRows = createProductionTrendMockRows(processType)
  const cutoff = getCurrentShiftCutoff()
  const visibleDayRows = allRows.filter((row) => row.dateKey <= cutoff.dateKey)
  const aggregateRows = allRows.filter((row) => isAtOrBeforeShiftCutoff(row, cutoff))
  const allPeriods = [...periods.inlinePeriods, ...periods.modalPeriods]
  const periodValues: Record<string, ProductionTrendPeriodValue> = {}

  for (const period of allPeriods) {
    const sourceRows = period.kind === 'day' ? visibleDayRows : aggregateRows
    periodValues[period.key] = aggregateProductionTrendRows(
      getRowsForPeriod(sourceRows, [processType], periods.segmentGroups, period),
    )
  }

  const tableRows = createProductionPlanTrendRows(presentation.rowQuantityLabel)
  const tableData = createTableData(periods.inlinePeriods, periodValues)
  const modalTableData = createTableData(periods.modalPeriods, periodValues)
  const chartOptions = createProductionPlanTrendChartOptions(presentation.chartQuantityLabel)
  const processLabel = getCssMapProcessLabel(processType, config)

  return {
    id: `production-plan-trend:${processType}`,
    title: `${processLabel} 生产性推移表`,
    subtitle: '固定模拟数据，按月、周及当前周工作日汇总',
    tableRows,
    tableColumns: createTrendColumns(periods.inlinePeriods, false),
    tableData,
    chartOptions,
    chartData: createChartData(periods.inlinePeriods, tableData),
    modalTableRows: tableRows,
    modalTableColumns: createTrendColumns(periods.modalPeriods, true),
    modalTableData,
    modalChartOptions: chartOptions,
    modalChartData: createChartData(periods.modalPeriods, modalTableData),
  }
}

export function createProductionPlanTrendCards(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): readonly FactoryDashboardCard[] {
  return processTypes.flatMap((processType) => {
    const card = createProductionPlanTrendCard(department, processType, config)
    return card === null ? [] : [card]
  })
}
