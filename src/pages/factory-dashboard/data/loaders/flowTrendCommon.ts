import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableCellValue,
  TableData,
  TableRowConfig,
} from '../../../../components/table-chart-card/TableChartCard.types'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { calculateRate, sumBy } from './numberUtils'
import { toApiDepartmentCode } from './cssMapValueMapping'
import {
  createTrendColumns,
  createTrendPeriods,
  type DailyProcessRow,
  getRowsForPeriod,
  type TrendPeriod,
  type TrendPeriods,
} from './trendPeriodBuilder'
import { extractDayFromDate } from './attendanceShifts'

export interface FlowDailyRow extends DailyProcessRow {
  readonly plan: number | null
  readonly actual: number | null
}

export interface FlowPeriodValue {
  readonly plan: number | null
  readonly actual: number | null
  readonly gap: number | null
  readonly rate: number | null
}

const percentFormatter = (value: TableCellValue): string => {
  if (typeof value === 'number') return `${value.toFixed(1)}%`
  if (typeof value === 'string') return value
  return '-'
}

export function normalizeDeptCode(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

export function recordMatchesDepartment(
  record: { readonly dept?: number | string },
  department: CssMapDepartmentValue,
): boolean {
  return normalizeDeptCode(record.dept) === Number(toApiDepartmentCode(department))
}

export function hasScopedDepartment(record: { readonly dept?: number | string }): boolean {
  const dept = normalizeDeptCode(record.dept)
  return typeof dept === 'number' && dept > 0
}

export function filterRecordsForDepartment<T extends { readonly dept?: number | string }>(
  records: readonly T[],
  department: CssMapDepartmentValue,
): readonly T[] {
  if (!records.some(hasScopedDepartment)) {
    return records
  }

  return records.filter((record) => recordMatchesDepartment(record, department))
}

export function createInboundDailyFlowRows(
  processType: CssMapProcessValue,
  planRecords: readonly { readonly date: string; readonly number?: number }[],
  actualRecords: readonly { readonly date: string; readonly number?: number }[],
): readonly FlowDailyRow[] {
  const rowMap = new Map<
    number,
    { processType: CssMapProcessValue; day: number; plan: number | null; actual: number | null }
  >()

  function getRow(day: number) {
    const row = rowMap.get(day) ?? { processType, day, plan: null, actual: null }
    rowMap.set(day, row)
    return row
  }

  for (const record of planRecords) {
    const row = getRow(extractDayFromDate(record.date))
    row.plan = (row.plan ?? 0) + (record.number ?? 0)
  }

  for (const record of actualRecords) {
    const row = getRow(extractDayFromDate(record.date))
    row.actual = (row.actual ?? 0) + (record.number ?? 0)
  }

  return [...rowMap.values()]
}

export function aggregateFlowPeriod(rows: readonly FlowDailyRow[]): FlowPeriodValue {
  const planRows = rows.filter((row) => typeof row.plan === 'number')
  const actualRows = rows.filter((row) => typeof row.actual === 'number')
  const plan = planRows.length > 0 ? sumBy(planRows, (row) => row.plan ?? 0) : null
  const actual = actualRows.length > 0 ? sumBy(actualRows, (row) => row.actual ?? 0) : null
  const gap = typeof plan === 'number' && typeof actual === 'number' ? actual - plan : null
  const rate = calculateRate(actual, plan)

  return { plan, actual, gap, rate }
}

export function createFlowTableData(
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

export function createFlowChartData(
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

export function getFlowChartPeriods(periods: readonly TrendPeriod[]): readonly TrendPeriod[] {
  return periods.filter((period) => period.kind !== 'month' && period.kind !== 'toDate')
}

export function cloneRowsWithPercent(
  rows: readonly TableRowConfig[],
  rateKey: string,
): readonly TableRowConfig[] {
  return rows.map((row) =>
    row.key === rateKey ? { ...row, formatter: percentFormatter } : row,
  )
}

export function createFlowTrendCard(params: {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly department: CssMapDepartmentValue
  readonly processTypes: readonly CssMapProcessValue[]
  readonly dailyRows: readonly FlowDailyRow[]
  readonly aggregateDailyRows?: readonly FlowDailyRow[]
  readonly tableRows: readonly TableRowConfig[]
  readonly chartOptions: ChartOptionConfig
  readonly keys: { readonly plan: string; readonly actual: string; readonly gap: string; readonly rate: string }
  readonly periods?: TrendPeriods
  readonly chartDataFactory?: typeof createFlowChartData
}): FactoryDashboardCard | null {
  const periods = params.periods ?? createTrendPeriods(params.department, params.processTypes)
  if (periods === null) return null

  const allPeriods = [...periods.inlinePeriods, ...periods.modalPeriods]
  const periodValues: Record<string, FlowPeriodValue> = {}
  for (const period of allPeriods) {
    const sourceRows = period.kind === 'day'
      ? params.dailyRows
      : params.aggregateDailyRows ?? params.dailyRows
    periodValues[period.key] = aggregateFlowPeriod(
      getRowsForPeriod(sourceRows, params.processTypes, periods.segmentGroups, period),
    )
  }

  const tableRows = cloneRowsWithPercent(params.tableRows, params.keys.rate)
  const tableData = createFlowTableData(periods.inlinePeriods, periodValues, params.keys)
  const modalTableData = createFlowTableData(periods.modalPeriods, periodValues, params.keys)
  const chartPeriods = getFlowChartPeriods(periods.inlinePeriods)
  const modalChartPeriods = getFlowChartPeriods(periods.modalPeriods)
  const chartDataFactory = params.chartDataFactory ?? createFlowChartData

  return {
    id: params.id,
    title: params.title,
    subtitle: params.subtitle,
    tableRows,
    tableColumns: createTrendColumns(periods.inlinePeriods, false),
    tableData,
    chartOptions: params.chartOptions,
    chartData: chartDataFactory(chartPeriods, tableData, params.keys),
    modalTableRows: tableRows,
    modalTableColumns: createTrendColumns(periods.modalPeriods, true),
    modalTableData,
    modalChartOptions: params.chartOptions,
    modalChartData: chartDataFactory(modalChartPeriods, modalTableData, params.keys),
  }
}
