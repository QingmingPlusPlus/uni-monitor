import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"
import {
  createWeekColumns,
  createWeekKey,
  getMaxSegmentIndex,
  getRowsInSegment,
  resolveProcessSegments,
} from "../../utils/departmentTrendAggregation"
import type {
  DepartmentTrendDailyRow,
  SegmentLookup,
} from "../../utils/departmentTrendAggregation"
import {
  defaultDepartmentInboundPlanTrendSegments,
  departmentInboundPlanTrendChartOptions,
  departmentInboundPlanTrendRows,
} from "./departmentInboundPlanTrendConfig"

export interface DepartmentInboundPlanTrendCardData {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly tableRows: readonly TableRowConfig[]
  readonly tableColumns: readonly TableColumnConfig[]
  readonly tableData: TableData
  readonly chartOptions: ChartOptionConfig
  readonly chartData: ChartDataConfig
}

export interface DepartmentInboundDailyRow extends DepartmentTrendDailyRow {
  readonly planInbound: number
  readonly actualInbound: number
}

interface InboundWeekAccumulator {
  readonly planInbound: number
  readonly actualInbound: number
}

function createEmptyAccumulator(): InboundWeekAccumulator {
  return {
    planInbound: 0,
    actualInbound: 0,
  }
}

function addInboundRows(
  accumulator: InboundWeekAccumulator,
  rows: readonly DepartmentInboundDailyRow[],
): InboundWeekAccumulator {
  return rows.reduce<InboundWeekAccumulator>(
    (current, row) => ({
      planInbound: current.planInbound + row.planInbound,
      actualInbound: current.actualInbound + row.actualInbound,
    }),
    accumulator,
  )
}

function createInboundTableData(
  weekKeys: readonly string[],
  weeklyData: Readonly<Record<string, InboundWeekAccumulator>>,
): TableData {
  const planInbound: Record<string, number> = {}
  const actualInbound: Record<string, number> = {}
  const gap: Record<string, number> = {}
  const achievementRate: Record<string, number> = {}

  for (const weekKey of weekKeys) {
    const week = weeklyData[weekKey] ?? createEmptyAccumulator()
    planInbound[weekKey] = week.planInbound
    actualInbound[weekKey] = week.actualInbound
    gap[weekKey] = week.actualInbound - week.planInbound
    achievementRate[weekKey] = week.planInbound > 0
      ? Number(((week.actualInbound / week.planInbound) * 100).toFixed(1))
      : 0
  }

  return {
    planInbound,
    actualInbound,
    gap,
    achievementRate,
  }
}

function createInboundChartData(
  columns: readonly TableColumnConfig[],
  tableData: TableData,
): ChartDataConfig {
  const weekKeys = columns.map((column) => column.key)

  return {
    xAxisData: columns.map((column) => column.label),
    series: [
      { id: "planInbound", data: weekKeys.map((key) => tableData.planInbound?.[key] ?? 0) },
      { id: "actualInbound", data: weekKeys.map((key) => tableData.actualInbound?.[key] ?? 0) },
      { id: "achievementRate", data: weekKeys.map((key) => tableData.achievementRate?.[key] ?? 0) },
    ],
  }
}

export function createDepartmentInboundDailyRows(
  processTypes: readonly string[],
): readonly DepartmentInboundDailyRow[] {
  return processTypes.flatMap((processType, processIndex) =>
    Array.from({ length: 30 }, (_, index) => {
      const day = index + 1
      const planInbound = 11800 + processIndex * 960 + day * 110
      const variance = ((day + processIndex) % 5 - 2) * 140

      return {
        processType,
        day,
        planInbound,
        actualInbound: Math.max(0, planInbound + variance),
      }
    }),
  )
}

export function createDepartmentInboundPlanTrendCardData(
  processTypes: readonly string[],
  segmentLookup: SegmentLookup,
  dailyRows: readonly DepartmentInboundDailyRow[] = createDepartmentInboundDailyRows(processTypes),
): DepartmentInboundPlanTrendCardData | null {
  const segmentGroups = resolveProcessSegments(processTypes, segmentLookup)
  if (segmentGroups === null) {
    return null
  }

  const maxSegmentIndex = getMaxSegmentIndex(segmentGroups)
  const columns = createWeekColumns(maxSegmentIndex)
  const weeklyData: Record<string, InboundWeekAccumulator> = {}

  processTypes.forEach((processType, processIndex) => {
    const segments = segmentGroups[processIndex] ?? []
    for (const segment of segments) {
      const weekKey = createWeekKey(segment.segmentIndex)
      const accumulator = weeklyData[weekKey] ?? createEmptyAccumulator()
      const rows = getRowsInSegment(dailyRows, processType, segment)
      weeklyData[weekKey] = addInboundRows(accumulator, rows)
    }
  })

  const tableData = createInboundTableData(
    columns.map((column) => column.key),
    weeklyData,
  )

  return {
    id: "department-inbound-plan-trend",
    title: "入库计划推移表",
    subtitle: "按周汇总部门入库计划与实绩",
    tableRows: departmentInboundPlanTrendRows,
    tableColumns: columns,
    tableData,
    chartOptions: departmentInboundPlanTrendChartOptions,
    chartData: createInboundChartData(columns, tableData),
  }
}

const defaultDepartmentInboundPlanTrendCard = createDepartmentInboundPlanTrendCardData(
  ["pretreatment1"],
  () => defaultDepartmentInboundPlanTrendSegments,
)

export const departmentInboundPlanTrendColumns =
  defaultDepartmentInboundPlanTrendCard?.tableColumns ?? []
export const departmentInboundPlanTrendTableData =
  defaultDepartmentInboundPlanTrendCard?.tableData ?? {}
export const departmentInboundPlanTrendChartData =
  defaultDepartmentInboundPlanTrendCard?.chartData ?? {}
export {
  departmentInboundPlanTrendChartOptions,
  departmentInboundPlanTrendRows,
}
