import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { getCurrentMonthParam, getCurrentShiftCutoff } from './dateTimeUtils'
import {
  createDailyFlowRows,
  createFlowTrendCard,
  createProductionPlanTrendChartOptions,
  filterScheduleRecordsForScope,
  isSchedulePlanAtOrBeforeShiftCutoff,
  type ScheduleScope,
} from './flowTrendCommon'
import { loadProcessDeviceCodeMap } from './factoryMapConfigCache'
import {
  invalidateProductionScheduleRecords,
  loadScheduleOutputRecords,
  loadSchedulePlanRecords,
  type ScheduleTrendLoadOptions,
} from './scheduleRecordCache'

export async function loadProductionPlanTrendCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  options: ScheduleTrendLoadOptions = {},
): Promise<FactoryDashboardCard | null> {
  if (processTypes.length === 0) return null

  const month = getCurrentMonthParam()
  if (options.forceRefresh === true) {
    invalidateProductionScheduleRecords(month)
  }

  const [deviceCodeMap, planRecords, actualRecords] = await Promise.all([
    loadProcessDeviceCodeMap(),
    loadSchedulePlanRecords(month),
    loadScheduleOutputRecords(month),
  ])
  const scope: ScheduleScope = { department, processTypes, deviceCodeMap }
  const scopedPlanRecords = filterScheduleRecordsForScope(planRecords, scope)
  const scopedActualRecords = filterScheduleRecordsForScope(actualRecords, scope)
  const dailyRows = createDailyFlowRows(
    processTypes,
    scopedPlanRecords,
    scopedActualRecords,
  )
  const cutoff = getCurrentShiftCutoff()
  const aggregateDailyRows = createDailyFlowRows(
    processTypes,
    scopedPlanRecords.filter((record) => isSchedulePlanAtOrBeforeShiftCutoff(record, cutoff)),
    scopedActualRecords,
  )
  const hasActual = dailyRows.some((row) => typeof row.actual === 'number')

  return createFlowTrendCard({
    id: 'process-production-plan-trend',
    title: '生产计划实绩推移表',
    subtitle: hasActual
      ? '按月、周及当前周工作日别汇总生产计划与实绩'
      : '按月、周及当前周工作日别汇总生产计划；当前月实绩接口暂无记录',
    department,
    processTypes,
    dailyRows,
    aggregateDailyRows,
    tableRows: [
      { key: 'plan', label: '计划生产数' },
      { key: 'actual', label: '实绩生产数', tone: 'success' },
      { key: 'gap', label: '实绩-计划', tone: 'muted' },
      { key: 'achievementRate', label: '生产达成率' },
    ],
    chartOptions: createProductionPlanTrendChartOptions(),
    keys: {
      plan: 'plan',
      actual: 'actual',
      gap: 'gap',
      rate: 'achievementRate',
    },
  })
}
