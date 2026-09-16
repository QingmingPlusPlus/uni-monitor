import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardCard } from '../factoryDashboardTypes'
import { getScheduleRejectsByMonth, type ScheduleMonthlyRecord } from '../../../../api/schedule'
import type { TableData } from '../../../../components/table-chart-card/TableChartCard.types'
import { getCurrentMonthParam, getCurrentShiftCutoff, extractLocalDateKey } from './dateTimeUtils'
import {
  createDailyFlowRows,
  createFlowTrendCard,
  createProductionPlanTrendChartOptions,
  filterScheduleRecordsForScope,
  isSchedulePlanAtOrBeforeShiftCutoff,
  type ScheduleScope,
} from './flowTrendCommon'
import { loadProcessDeviceCodeMap, normalizeDeviceCode } from './factoryMapConfigCache'
import { createTrendPeriods, getRowsForPeriod, type TrendPeriod } from './trendPeriodBuilder'
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

  const [deviceCodeMap, planRecords, actualRecords, rejectsResponse] = await Promise.all([
    loadProcessDeviceCodeMap(),
    loadSchedulePlanRecords(month),
    loadScheduleOutputRecords(month),
    getScheduleRejectsByMonth(month).catch(() => null),
  ])
  const scope: ScheduleScope = { department, processTypes, deviceCodeMap }
  const cutoff = getCurrentShiftCutoff()
  const validRecord = (record: ScheduleMonthlyRecord) => {
    const date = extractLocalDateKey(record.workDate ?? record.date ?? '')
    return date !== null && Math.floor(date / 100) === Number(month.replace('-', '')) && date <= cutoff.dateKey &&
      typeof record.number === 'number' && Number.isFinite(record.number) && record.number >= 0
  }
  const scopedPlanRecords = filterScheduleRecordsForScope(planRecords.filter(validRecord), scope)
  const scopedActualRecords = filterScheduleRecordsForScope(actualRecords.filter(record =>
    validRecord(record) && isSchedulePlanAtOrBeforeShiftCutoff(record, cutoff)), scope)
  const dailyRows = createDailyFlowRows(
    processTypes,
    scopedPlanRecords,
    scopedActualRecords,
  )
  const aggregateDailyRows = createDailyFlowRows(
    processTypes,
    scopedPlanRecords.filter((record) => isSchedulePlanAtOrBeforeShiftCutoff(record, cutoff)),
    scopedActualRecords,
  )
  const hasActual = dailyRows.some((row) => typeof row.actual === 'number')

  const periods = createTrendPeriods(department, processTypes)
  if (periods === null) return null
  const rejects = rejectsResponse?.data?.success === false ? [] : rejectsResponse?.data?.data
  const rejectedRows = (Array.isArray(rejects) ? rejects : []).flatMap(record => {
    if (!validRecord(record) || !isSchedulePlanAtOrBeforeShiftCutoff(record, cutoff)) return []
    const matches = processTypes.filter(process => deviceCodeMap[process]?.has(normalizeDeviceCode(record.shebei)))
    if (matches.length !== 1) return []
    return [{ processType: matches[0]!, day: extractLocalDateKey(record.date)! % 100, rejected: record.number }]
  })
  const extendTable = (data: TableData, list: readonly TrendPeriod[]): TableData => {
    const empty = Object.fromEntries(list.map(period => [period.key, null]))
    const rejected = Object.fromEntries(list.map(period => {
      const rows = getRowsForPeriod(rejectedRows, processTypes, periods.segmentGroups, period)
      return [period.key, rows.length ? rows.reduce((total, row) => total + row.rejected, 0) : null]
    }))
    const { gap: _gap, ...visibleData } = data
    // 暂缺合格数、其他的权威字段，质量比率分母亦未确认；不得按零或差值推算。
    return { ...visibleData, qualified: empty, rejected, other: empty, qualifiedRate: empty, defectRate: empty }
  }
  const card = createFlowTrendCard({
    id: 'process-production-plan-trend',
    title: '生产计划实绩推移表',
    subtitle: hasActual
      ? '按月、周及当前周工作日别汇总生产计划与实绩'
      : '按月、周及当前周工作日别汇总生产计划；当前月实绩接口暂无记录',
    department,
    processTypes,
    dailyRows,
    aggregateDailyRows,
    periods,
    tableRows: [
      { key: 'plan', label: '计划生产数' },
      { key: 'actual', label: '实绩生产数', tone: 'success' },
      { key: 'qualified', label: '合格数' },
      { key: 'rejected', label: '不良数', tone: 'danger' },
      { key: 'other', label: '其他' },
      { key: 'achievementRate', label: '达成率' },
      { key: 'qualifiedRate', label: '合格率' },
      { key: 'defectRate', label: '不良率' },
    ],
    chartOptions: createProductionPlanTrendChartOptions(),
    chartDataFactory: (chartPeriods, data) => ({
      xAxisData: chartPeriods.map(period => period.label),
      series: ['plan', 'actual', 'qualified', 'achievementRate', 'qualifiedRate'].map(id => ({
        id, data: chartPeriods.map(period => data[id]?.[period.key] ?? null),
      })),
    }),
    keys: {
      plan: 'plan',
      actual: 'actual',
      gap: 'gap',
      rate: 'achievementRate',
    },
  })
  if (card === null) return null
  return { ...card, tableData: extendTable(card.tableData, periods.inlinePeriods),
    modalTableData: extendTable(card.modalTableData ?? {}, periods.modalPeriods) }
}
