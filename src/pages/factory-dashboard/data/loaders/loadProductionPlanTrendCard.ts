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
} from '../../../../components/process-production-plan-trend-card/processProductionPlanTrendMock'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { computeNaturalWeeks } from '../../../../utils/monthSegment'
import type { SegmentVO } from '../../../../api/basic'
import {
  createTrendColumns,
  createTrendPeriods,
  createTrendPeriodsFromSegmentGroups,
  type TrendPeriod,
} from './trendPeriodBuilder'

export type ProductionTrendMetricKey =
  | 'planCount'
  | 'actualCount'
  | 'planMh'
  | 'actualMh'
  | 'planProductivity'
  | 'actualProductivity'

export interface ProductionTrendPeriodValue {
  readonly planCount: number | null
  readonly actualCount: number | null
  readonly planMh: number | null
  readonly actualMh: number | null
  readonly planProductivity: number | null
  readonly actualProductivity: number | null
}

interface ProcessPresentation {
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

function getProcessPresentation(processType: CssMapProcessValue): ProcessPresentation {
  if (processType.startsWith('pretreatment')) {
    return {
      rowQuantityLabel: '粘接数',
      chartQuantityLabel: '粘接数',
    }
  }

  if (processType.startsWith('vulcanization')) {
    return {
      rowQuantityLabel: '加硫数',
      chartQuantityLabel: '加硫数',
    }
  }

  return {
    rowQuantityLabel: '入库数（含待倒箱、端数等）',
    chartQuantityLabel: '入库数',
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
  realPeriodValues?: (period: TrendPeriod, segmentGroups: readonly (readonly SegmentVO[])[]) => ProductionTrendPeriodValue,
): FactoryDashboardCard | null {
  const now = new Date()
  const periods = createTrendPeriods(department, [processType])
    ?? createTrendPeriodsFromSegmentGroups([
      computeNaturalWeeks(now.getFullYear(), now.getMonth() + 1),
    ])

  const presentation = getProcessPresentation(processType)
  const allPeriods = [...periods.inlinePeriods, ...periods.modalPeriods]
  const periodValues: Record<string, ProductionTrendPeriodValue> = {}

  for (const period of allPeriods) {
    periodValues[period.key] = realPeriodValues?.(period, periods.segmentGroups) ?? {
      planCount: null, actualCount: null, planMh: null, actualMh: null,
      planProductivity: null, actualProductivity: null,
    }
  }

  const tableRows = createProductionPlanTrendRows(presentation.rowQuantityLabel)
  const tableData = createTableData(periods.inlinePeriods, periodValues)
  const modalTableData = createTableData(periods.modalPeriods, periodValues)
  const chartOptions = createProductionPlanTrendChartOptions(presentation.chartQuantityLabel)
  const processLabel = getCssMapProcessLabel(processType, config)

  return {
    id: `production-plan-trend:${processType}`,
    title: `${processLabel} 生产性推移表`,
    subtitle: '按月、周及当前周工作日汇总；实绩MH及实绩个数生产性待计算',
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
