import { getMonthlyAttendanceSituation } from '../../../../api/attendance'
import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableCellValue,
  TableData,
  TableRowConfig,
} from '../../../../components/table-chart-card/TableChartCard.types'
import {
  attendanceTrendChartOptions,
  attendanceTrendRows,
} from '../../../../components/attendance-trend-card/attendanceTrendConfig'
import type { AttendanceTrendDailyRow } from '../../../../components/attendance-trend-card/attendanceTrendMock'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import {
  extractDayFromDate,
  getCurrentMonthParam,
  getCurrentShiftCutoff,
  isDateAtOrBeforeShiftCutoff,
} from './dateTimeUtils'
import { averageBy, sumBy } from './numberUtils'
import {
  createTrendColumns,
  createTrendPeriods,
  type DailyProcessRow,
  getRowsForPeriod,
  type TrendPeriod,
} from './trendPeriodBuilder'
import { toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'

interface AttendancePeriodValue {
  readonly indirectCount: number | null
  readonly directCount: number | null
  readonly directAttendance: number | null
  readonly directRate: number | null
}

const percentFormatter = (value: TableCellValue): string => {
  if (typeof value === 'number') return `${value.toFixed(1)}%`
  if (typeof value === 'string') return value
  return '-'
}

function aggregateAttendancePeriod(
  rows: readonly AttendanceTrendDailyRow[],
  excludeZeroDays = false,
): AttendancePeriodValue {
  const validRows = rows.filter(
    (row) =>
      row.indirectCount > 0 ||
      row.directCount > 0 ||
      row.directAttendance > 0,
  )

  if (validRows.length === 0) {
    return {
      indirectCount: null,
      directCount: null,
      directAttendance: null,
      directRate: null,
    }
  }

  const indirectCountRows = excludeZeroDays
    ? validRows.filter((row) => row.indirectCount > 0)
    : validRows
  const directCountRows = excludeZeroDays
    ? validRows.filter((row) => row.directCount > 0)
    : validRows
  const directAttendanceRows = excludeZeroDays
    ? validRows.filter((row) => row.directAttendance > 0)
    : validRows

  const directCountSum = sumBy(directAttendanceRows, (row) => row.directCount)
  const directAttendanceSum = sumBy(directAttendanceRows, (row) => row.directAttendance)

  return {
    indirectCount: indirectCountRows.length > 0
      ? Math.round(averageBy(indirectCountRows, (row) => row.indirectCount) ?? 0)
      : null,
    directCount: directCountRows.length > 0
      ? Math.round(averageBy(directCountRows, (row) => row.directCount) ?? 0)
      : null,
    directAttendance: directAttendanceRows.length > 0
      ? Math.round(averageBy(directAttendanceRows, (row) => row.directAttendance) ?? 0)
      : null,
    directRate: directAttendanceRows.length > 0 && directCountSum > 0
      ? Number(((directAttendanceSum / directCountSum) * 100).toFixed(1))
      : null,
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
  return attendanceTrendRows.map((row) =>
    row.key === 'targetRate'
      ? { ...row, formatter: percentFormatter }
      : row,
  )
}

function createAttendanceTrendCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  dailyRows: readonly AttendanceTrendDailyRow[],
): FactoryDashboardCard | null {
  const periods = createTrendPeriods(department, processTypes)
  if (periods === null) return null

  const allPeriods = [...periods.inlinePeriods, ...periods.modalPeriods]
  const periodValues: Record<string, AttendancePeriodValue> = {}
  for (const period of allPeriods) {
    periodValues[period.key] = aggregateAttendancePeriod(
      getRowsForPeriod(dailyRows, processTypes, periods.segmentGroups, period),
      period.kind !== 'day',
    )
  }

  const tableRows = createAttendanceTrendRows()
  const tableData = createAttendanceTrendTableData(periods.inlinePeriods, periodValues)
  const modalTableData = createAttendanceTrendTableData(periods.modalPeriods, periodValues)

  return {
    id: 'attendance-trend',
    title: '出勤率推移表',
    subtitle: '按月、周及当前周工作日别汇总人员出勤情况',
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
  const cutoff = getCurrentShiftCutoff()

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
          if (!isDateAtOrBeforeShiftCutoff(vo.statDate, cutoff)) continue

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

  return createAttendanceTrendCard(department, processTypes, dailyRows)
}
