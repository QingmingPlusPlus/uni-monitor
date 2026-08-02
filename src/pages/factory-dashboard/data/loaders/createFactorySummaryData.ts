import type {
  PersonnelAttendanceData,
  PersonnelAttendanceRow,
  PersonnelAttendanceShift,
  ProductionActivityData,
  FactorySummaryData,
} from '../factoryDashboardTypes'
import { getCurrentAttendanceShift } from './dateTimeUtils'
import {
  loadScheduleOutputRecords,
  loadSchedulePlanRecords,
  loadScheduleRukuPlanRecords,
  loadScheduleRukuShijiRecords,
} from './scheduleRecordCache'
import { getCurrentMonthParam } from './dateTimeUtils'
import {
  calculateRate,
  formatOneDecimalPercent,
  formatRatioValue,
  sumBy,
} from './numberUtils'

function getAttendanceTotals(data: PersonnelAttendanceData): {
  readonly directRoster: number
  readonly directAttendance: number
  readonly indirectRoster: number
  readonly indirectAttendance: number
} {
  const currentShift = getCurrentAttendanceShift()
  const shiftsToSum: readonly PersonnelAttendanceShift[] = [currentShift]
  const detailGroups = data.groups.filter((group) => !group.label.endsWith('全体'))
  const sourceGroups = detailGroups.length > 0 ? detailGroups : data.groups
  const detailRows = sourceGroups.flatMap((group) =>
    group.rows.filter((row) => shiftsToSum.includes(row.shift)),
  )

  return {
    directRoster: sumBy(detailRows, (row) => row.directRosterTotal),
    directAttendance: sumBy(detailRows, (row) => row.actualAttendance),
    indirectRoster: sumBy(detailRows, (row) => row.indirectRosterTotal),
    indirectAttendance: sumBy(detailRows, (row) => row.indirectAttendanceTotal ?? 0),
  }
}

function sumScheduleNumber(records: readonly { readonly number?: number }[]): number | null {
  if (records.length === 0) return null
  return sumBy(records, (record) => record.number ?? 0)
}

export async function createFactorySummaryData(params: {
  readonly activity: ProductionActivityData
  readonly attendance: PersonnelAttendanceData
  readonly processTypes: readonly string[]
}): Promise<FactorySummaryData> {
  const running = params.activity.summaryRunningCount
  const total = params.activity.summaryTotalCount
  const attendance = getAttendanceTotals(params.attendance)
  const month = getCurrentMonthParam()
  const [rukuPlan, rukuShiji, schedulePlan, scheduleOutput] = await Promise.all([
    loadScheduleRukuPlanRecords(month),
    loadScheduleRukuShijiRecords(month),
    loadSchedulePlanRecords(month),
    loadScheduleOutputRecords(month),
  ])
  const inboundPlan = sumScheduleNumber(rukuPlan)
  const inboundActual = sumScheduleNumber(rukuShiji)
  const productionPlan = sumScheduleNumber(schedulePlan)
  const productionActual = sumScheduleNumber(scheduleOutput)

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
        value: formatRatioValue(inboundActual, inboundPlan),
        rate: formatOneDecimalPercent(calculateRate(inboundActual, inboundPlan)),
      },
      {
        id: 'production',
        label: '生产实际（个）',
        value: formatRatioValue(productionActual, productionPlan),
        rate: formatOneDecimalPercent(calculateRate(productionActual, productionPlan)),
      },
    ],
  }
}
