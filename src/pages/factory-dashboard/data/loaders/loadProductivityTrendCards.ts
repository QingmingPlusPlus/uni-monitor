import type { ScheduleMonthlyRecord } from '../../../../api/schedule'
import type { CssMapDepartmentValue, CssMapProcessValue, CssMapSelectionConfig } from '../../../../components/css-map/css3dMapTypes'
import { defaultCssMapSelectionConfig } from '../../../../components/css-map/css3dMapSelection'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { extractLocalDateKey, getCurrentMonthParam, getCurrentShiftCutoff } from './dateTimeUtils'
import { filterScheduleRecordsForScope, isSchedulePlanAtOrBeforeShiftCutoff } from './flowTrendCommon'
import { loadProcessDeviceCodeMap } from './factoryMapConfigCache'
import { createProductionPlanTrendCard, type ProductionTrendPeriodValue } from './loadProductionPlanTrendCard'
import { getRowsForPeriod } from './trendPeriodBuilder'
import { invalidateProductionScheduleRecords, loadScheduleOutputRecords, loadSchedulePlanRecords, type ScheduleTrendLoadOptions } from './scheduleRecordCache'
import { loadProductivityMhRows } from './productivityMhRecords'

interface ProductivityRow extends ScheduleMonthlyRecord {
  readonly processType: CssMapProcessValue
  readonly day: number
  readonly dateKey: number
}

function sumComplete(values: readonly (number | null | undefined)[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
    sum += value
  }
  return Number.isFinite(sum) ? sum : null
}

/** 使用未舍入的 MH 合计作分母；部分记录缺 MH 时不计算不完整的周期生产性。 */
export function aggregateRealProductivity(
  plans: readonly ScheduleMonthlyRecord[],
  actuals: readonly ScheduleMonthlyRecord[],
  actualMhValues: readonly (number | null | undefined)[] = [],
): ProductionTrendPeriodValue {
  const planCount = sumComplete(plans.map(row => row.number))
  const actualCount = sumComplete(actuals.map(row => row.number))
  const planMh = sumComplete(plans.map(row => row.mh))
  const actualMh = sumComplete(actualMhValues)
  return {
    planCount,
    actualCount,
    planMh,
    actualMh,
    planProductivity: planCount !== null && planMh !== null && planMh > 0 ? planCount / planMh : null,
    actualProductivity: actualCount !== null && actualMh !== null && actualMh > 0 ? actualCount / actualMh : null,
  }
}

export async function loadProductivityTrendCards(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
  options: ScheduleTrendLoadOptions = {},
): Promise<readonly FactoryDashboardCard[]> {
  if (processTypes.length === 0) return []
  const month = getCurrentMonthParam()
  if (options.forceRefresh) invalidateProductionScheduleRecords(month)
  const cutoff = getCurrentShiftCutoff()
  const deviceMapRequest = loadProcessDeviceCodeMap()
  const [deviceCodeMap, plans, actuals, mhRows] = await Promise.all([
    deviceMapRequest, loadSchedulePlanRecords(month), loadScheduleOutputRecords(month),
    deviceMapRequest.then(map => loadProductivityMhRows(month, department, processTypes, map, cutoff, options)),
  ])
  const scope = { department, processTypes, deviceCodeMap }
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()
  const toRows = (records: readonly ScheduleMonthlyRecord[], isPlan: boolean): ProductivityRow[] =>
    filterScheduleRecordsForScope(records, scope).flatMap(record => {
      const date = isPlan ? record.workDate ?? record.date : record.date ?? record.workDate
      if (typeof date !== 'string' || !date.startsWith(`${month}-`)) return []
      const dateKey = extractLocalDateKey(date)
      if (dateKey === null || dateKey > cutoff.dateKey) return []
      const day = dateKey % 100
      if (day < 1 || day > lastDay) return []
      return [{ ...record, workDate: date, date, dateKey, day }]
    })
  const planRows = toRows(plans, true)
  const actualRows = toRows(actuals, false).filter(row => isSchedulePlanAtOrBeforeShiftCutoff(row, cutoff))
  const aggregatePlanRows = planRows.filter(row => isSchedulePlanAtOrBeforeShiftCutoff(row, cutoff))

  return processTypes.flatMap(processType => {
    const card = createProductionPlanTrendCard(department, processType, config, (period, groups) => {
      const periodPlans = getRowsForPeriod(period.kind === 'day' ? planRows : aggregatePlanRows, [processType], groups, period)
      const periodActuals = getRowsForPeriod(actualRows, [processType], groups, period)
      const periodMh = getRowsForPeriod(mhRows, [processType], groups, period)
      const coveredDays = new Set(periodMh.map(row => row.day))
      const values = periodMh.map(row => row.netHours)
      // 有产出而没有工时的日期使分母不完整，不能用其余日期的工时计算生产性。
      if (periodActuals.some(row => !coveredDays.has(row.day))) values.push(null)
      return aggregateRealProductivity(periodPlans, periodActuals, values)
    })
    return card ? [card] : []
  })
}
