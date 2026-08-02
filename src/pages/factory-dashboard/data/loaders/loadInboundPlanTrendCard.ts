import {
  departmentInboundPlanTrendChartOptions,
  departmentInboundPlanTrendRows,
} from '../../../../components/department-inbound-plan-trend-card/departmentInboundPlanTrendConfig'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { getCurrentMonthParam } from './dateTimeUtils'
import {
  createFlowTrendCard,
  createInboundDailyFlowRows,
  filterRecordsForDepartment,
} from './flowTrendCommon'
import {
  invalidateInboundScheduleRecords,
  loadScheduleRukuPlanRecords,
  loadScheduleRukuShijiRecords,
  type ScheduleTrendLoadOptions,
} from './scheduleRecordCache'

export async function loadInboundPlanTrendCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  options: ScheduleTrendLoadOptions = {},
): Promise<FactoryDashboardCard | null> {
  if (processTypes.length === 0) return null

  const month = getCurrentMonthParam()
  if (options.forceRefresh === true) {
    invalidateInboundScheduleRecords(month)
  }

  const [planRecords, actualRecords] = await Promise.all([
    loadScheduleRukuPlanRecords(month),
    loadScheduleRukuShijiRecords(month),
  ])
  const bucketProcessType = processTypes[0]
  const scopedPlanRecords = filterRecordsForDepartment(planRecords, department)
  const scopedActualRecords = filterRecordsForDepartment(actualRecords, department)
  const dailyRows = createInboundDailyFlowRows(bucketProcessType, scopedPlanRecords, scopedActualRecords)
  const hasActual = dailyRows.some((row) => typeof row.actual === 'number')

  return createFlowTrendCard({
    id: 'department-inbound-plan-trend',
    title: '入库计划实绩推移表',
    subtitle: hasActual
      ? '按月、周及当前周工作日别汇总入库计划与实绩'
      : '按月、周及当前周工作日别汇总入库计划；当前月实绩接口暂无记录',
    department,
    processTypes: [bucketProcessType],
    dailyRows,
    tableRows: departmentInboundPlanTrendRows,
    chartOptions: departmentInboundPlanTrendChartOptions,
    keys: {
      plan: 'planInbound',
      actual: 'actualInbound',
      gap: 'gap',
      rate: 'achievementRate',
    },
  })
}
