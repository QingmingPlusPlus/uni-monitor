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
  attendanceTrendChartOptions,
  attendanceTrendPalette,
  attendanceTrendRows,
  defaultAttendanceTrendSegments,
} from "./attendanceTrendConfig"

export interface AttendanceTrendCardData {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly tableRows: readonly TableRowConfig[]
  readonly tableColumns: readonly TableColumnConfig[]
  readonly tableData: TableData
  readonly chartOptions: ChartOptionConfig
  readonly chartData: ChartDataConfig
}

export interface AttendanceTrendDailyRow extends DepartmentTrendDailyRow {
  readonly indirectCount: number
  readonly directCount: number
  readonly directAttendance: number
  readonly targetRate: number
}

interface AttendanceWeekAccumulator {
  readonly indirectCount: number
  readonly directCount: number
  readonly directAttendance: number
  readonly targetRateSum: number
  readonly targetRateDays: number
}

function createEmptyAccumulator(): AttendanceWeekAccumulator {
  return {
    indirectCount: 0,
    directCount: 0,
    directAttendance: 0,
    targetRateSum: 0,
    targetRateDays: 0,
  }
}

function addAttendanceRows(
  accumulator: AttendanceWeekAccumulator,
  rows: readonly AttendanceTrendDailyRow[],
): AttendanceWeekAccumulator {
  return rows.reduce<AttendanceWeekAccumulator>(
    (current, row) => ({
      indirectCount: current.indirectCount + row.indirectCount,
      directCount: current.directCount + row.directCount,
      directAttendance: current.directAttendance + row.directAttendance,
      targetRateSum: current.targetRateSum + row.targetRate,
      targetRateDays: current.targetRateDays + 1,
    }),
    accumulator,
  )
}

function createAttendanceTableData(
  weekKeys: readonly string[],
  weeklyData: Readonly<Record<string, AttendanceWeekAccumulator>>,
): TableData {
  const indirectCount: Record<string, number> = {}
  const directCount: Record<string, number> = {}
  const directAttendance: Record<string, number> = {}
  const directRate: Record<string, number> = {}
  const targetRate: Record<string, number> = {}

  for (const weekKey of weekKeys) {
    const week = weeklyData[weekKey] ?? createEmptyAccumulator()
    indirectCount[weekKey] = week.indirectCount
    directCount[weekKey] = week.directCount
    directAttendance[weekKey] = week.directAttendance
    directRate[weekKey] = week.directCount > 0
      ? Number(((week.directAttendance / week.directCount) * 100).toFixed(1))
      : 0
    targetRate[weekKey] = week.targetRateDays > 0
      ? week.targetRateSum / week.targetRateDays
      : 0
  }

  return {
    indirectCount,
    directCount,
    directAttendance,
    directRate,
    targetRate,
  }
}

function createAttendanceChartData(
  columns: readonly TableColumnConfig[],
  tableData: TableData,
): ChartDataConfig {
  const weekKeys = columns.map((column) => column.key)

  return {
    xAxisData: columns.map((column) => column.label),
    series: [
      { id: "directCount", data: weekKeys.map((key) => tableData.directCount?.[key] ?? 0) },
      { id: "directAttendance", data: weekKeys.map((key) => tableData.directAttendance?.[key] ?? 0) },
      { id: "indirectCount", data: weekKeys.map((key) => tableData.indirectCount?.[key] ?? 0) },
      { id: "directRate", data: weekKeys.map((key) => tableData.directRate?.[key] ?? 0) },
      { id: "targetRate", data: weekKeys.map((key) => tableData.targetRate?.[key] ?? 0) },
    ],
  }
}

export function createAttendanceTrendDailyRows(
  processTypes: readonly string[],
): readonly AttendanceTrendDailyRow[] {
  return processTypes.flatMap((processType, processIndex) =>
    Array.from({ length: 30 }, (_, index) => {
      const day = index + 1
      const directCount = 68 + processIndex * 5 - (day % 10 === 0 ? 1 : 0)
      const absence = (day + processIndex) % 6

      return {
        processType,
        day,
        indirectCount: 3 + (processIndex % 2),
        directCount,
        directAttendance: Math.max(0, directCount - absence),
        targetRate: 91,
      }
    }),
  )
}

export function createAttendanceTrendCardData(
  processTypes: readonly string[],
  segmentLookup: SegmentLookup,
  dailyRows: readonly AttendanceTrendDailyRow[] = createAttendanceTrendDailyRows(processTypes),
): AttendanceTrendCardData | null {
  const segmentGroups = resolveProcessSegments(processTypes, segmentLookup)
  if (segmentGroups === null) {
    return null
  }

  const maxSegmentIndex = getMaxSegmentIndex(segmentGroups)
  const columns = createWeekColumns(maxSegmentIndex)
  const weeklyData: Record<string, AttendanceWeekAccumulator> = {}

  processTypes.forEach((processType, processIndex) => {
    const segments = segmentGroups[processIndex] ?? []
    for (const segment of segments) {
      const weekKey = createWeekKey(segment.segmentIndex)
      const accumulator = weeklyData[weekKey] ?? createEmptyAccumulator()
      const rows = getRowsInSegment(dailyRows, processType, segment)
      weeklyData[weekKey] = addAttendanceRows(accumulator, rows)
    }
  })

  const tableData = createAttendanceTableData(
    columns.map((column) => column.key),
    weeklyData,
  )

  return {
    id: "department-attendance-trend",
    title: "出勤率推移表",
    subtitle: "按周汇总人员出勤情况",
    tableRows: attendanceTrendRows,
    tableColumns: columns,
    tableData,
    chartOptions: attendanceTrendChartOptions,
    chartData: createAttendanceChartData(columns, tableData),
  }
}

const defaultAttendanceTrendCard = createAttendanceTrendCardData(
  ["pretreatment1"],
  () => defaultAttendanceTrendSegments,
)

export const attendanceTrendColumns = defaultAttendanceTrendCard?.tableColumns ?? []
export const attendanceTrendTableData = defaultAttendanceTrendCard?.tableData ?? {}
export const attendanceTrendChartData = defaultAttendanceTrendCard?.chartData ?? {}
export {
  attendanceTrendChartOptions,
  attendanceTrendPalette,
  attendanceTrendRows,
}
