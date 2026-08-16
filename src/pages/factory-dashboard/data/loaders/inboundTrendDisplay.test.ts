import { describe, expect, it } from 'vitest'
import { departmentInboundPlanTrendChartOptions } from '../../../../components/department-inbound-plan-trend-card/departmentInboundPlanTrendConfig'
import { resolveChartOptions } from '../../../../components/table-chart-card/TableChartCard.logic'
import type { TableData } from '../../../../components/table-chart-card/TableChartCard.types'
import {
  aggregateFlowPeriod,
  createFlowTableData,
  getFlowChartPeriods,
  type FlowDailyRow,
} from './flowTrendCommon'
import {
  createInboundFlowChartData,
  createInboundMonthSegments,
  createInboundTrendPeriods,
} from './inboundTrendDisplay'
import { getRowsForPeriod, type TrendPeriod } from './trendPeriodBuilder'

const processTypes = ['pretreatment1'] as const
const chartKeys = {
  plan: 'planInbound',
  actual: 'actualInbound',
  rate: 'achievementRate',
} as const

describe('createInboundTrendPeriods', () => {
  it('八月一日生成全月、截止当天、1W至5W和当前周全部自然日', () => {
    const periods = createInboundTrendPeriods(processTypes, new Date(2026, 7, 1, 8, 0, 0))

    expect(periods.inlinePeriods.map((period) => period.key)).toEqual([
      'month',
      'toDate',
      'week1',
      'week2',
      'week3',
      'week4',
      'week5',
      'day1',
      'day2',
      'day3',
      'day4',
      'day5',
      'day6',
      'day7',
    ])
    expect(periods.inlinePeriods.map((period) => period.label)).toEqual([
      '8月全月',
      '8月截止1日',
      '1W',
      '2W',
      '3W',
      '4W',
      '5W',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ])
    expect(periods.modalPeriods).toEqual(periods.inlinePeriods)
  })

  it('固定七日分桶不生成6W，并按月份是否存在29日决定5W', () => {
    const commonFebruary = createInboundTrendPeriods(processTypes, new Date(2027, 1, 28))
    const leapFebruary = createInboundTrendPeriods(processTypes, new Date(2028, 1, 29))

    expect(createInboundMonthSegments(31)).toEqual([
      { segmentIndex: 1, startDay: 1, endDay: 7 },
      { segmentIndex: 2, startDay: 8, endDay: 14 },
      { segmentIndex: 3, startDay: 15, endDay: 21 },
      { segmentIndex: 4, startDay: 22, endDay: 28 },
      { segmentIndex: 5, startDay: 29, endDay: 31 },
    ])
    expect(commonFebruary.inlinePeriods
      .filter((period) => period.kind === 'week')
      .map((period) => period.key)).toEqual(['week1', 'week2', 'week3', 'week4'])
    expect(leapFebruary.inlinePeriods
      .filter((period) => period.kind === 'week')
      .map((period) => period.key)).toEqual(['week1', 'week2', 'week3', 'week4', 'week5'])
  })

  it('月末当前周只生成29日至月末', () => {
    const periods = createInboundTrendPeriods(processTypes, new Date(2026, 7, 31))

    expect(periods.inlinePeriods.filter((period) => period.kind === 'day').map((period) => period.day))
      .toEqual([29, 30, 31])
  })
})

describe('入库周期聚合', () => {
  it('分别聚合全月、截止当天、完整周段和单日，并在表格保留真实零值', () => {
    const periods = createInboundTrendPeriods(processTypes, new Date(2026, 7, 16))
    const rows: readonly FlowDailyRow[] = [
      { processType: 'pretreatment1', day: 1, plan: 10, actual: 0 },
      { processType: 'pretreatment1', day: 2, plan: 20, actual: 15 },
      { processType: 'pretreatment1', day: 16, plan: 30, actual: 25 },
      { processType: 'pretreatment1', day: 31, plan: 40, actual: 35 },
    ]
    const values = Object.fromEntries(periods.inlinePeriods.map((period) => [
      period.key,
      aggregateFlowPeriod(getRowsForPeriod(
        rows,
        processTypes,
        periods.segmentGroups,
        period,
      )),
    ]))
    const tableData = createFlowTableData(periods.inlinePeriods, values, {
      ...chartKeys,
      gap: 'gap',
    })

    expect(tableData.planInbound.month).toBe(100)
    expect(tableData.actualInbound.month).toBe(75)
    expect(tableData.planInbound.toDate).toBe(60)
    expect(tableData.actualInbound.toDate).toBe(40)
    expect(tableData.planInbound.week1).toBe(30)
    expect(tableData.actualInbound.week1).toBe(15)
    expect(tableData.planInbound.day16).toBe(30)
    expect(tableData.actualInbound.day16).toBe(25)

    const dayOnePeriod: TrendPeriod = { kind: 'day', key: 'day1', label: '1', day: 1 }
    const dayOneValue = aggregateFlowPeriod(rows.filter((row) => row.day === 1))
    const dayOneTable = createFlowTableData([dayOnePeriod], { day1: dayOneValue }, {
      ...chartKeys,
      gap: 'gap',
    })
    expect(dayOneTable.actualInbound.day1).toBe(0)
  })
})

describe('createInboundFlowChartData', () => {
  const periods: readonly TrendPeriod[] = [
    { kind: 'week', key: 'week1', label: '1W', segmentIndex: 1 },
    { kind: 'week', key: 'week2', label: '2W', segmentIndex: 2 },
    { kind: 'week', key: 'week3', label: '3W', segmentIndex: 3 },
    { kind: 'day', key: 'day1', label: '1', day: 1 },
    { kind: 'day', key: 'day2', label: '2', day: 2 },
  ]

  it('排除累计周期并把零值转为空点', () => {
    const allPeriods: readonly TrendPeriod[] = [
      { kind: 'month', key: 'month', label: '8月全月' },
      { kind: 'toDate', key: 'toDate', label: '8月截止1日', day: 1 },
      ...periods,
    ]
    const chartPeriods = getFlowChartPeriods(allPeriods)
    const tableData: TableData = {
      planInbound: { week1: 100, week2: 0, week3: 120, day1: Number.NaN, day2: 0 },
      actualInbound: { week1: 0, week2: 0, week3: 0, day1: 0, day2: 0 },
      achievementRate: { week1: null, week2: Number.POSITIVE_INFINITY, week3: null },
    }

    expect(chartPeriods.map((period) => period.key)).toEqual([
      'week1', 'week2', 'week3', 'day1', 'day2',
    ])
    expect(createInboundFlowChartData(chartPeriods, tableData, chartKeys)).toEqual({
      xAxisData: ['1W', '2W', '3W'],
      series: [{ id: 'planInbound', data: [100, null, 120] }],
    })
  })

  it('裁剪首尾空类目、保留内部缺口并保持横轴与series等长', () => {
    const tableData: TableData = {
      planInbound: { week1: 0, week2: 100, week3: 0, day1: 120, day2: 0 },
      actualInbound: { week1: 0, week2: 0, week3: 0, day1: 0, day2: 0 },
      achievementRate: {},
    }
    const chartData = createInboundFlowChartData(periods, tableData, chartKeys)

    expect(chartData.xAxisData).toEqual(['2W', '3W', '1'])
    expect(chartData.series).toEqual([{ id: 'planInbound', data: [100, null, 120] }])
    expect(chartData.series?.[0]?.data).toHaveLength(chartData.xAxisData?.length ?? 0)
  })

  it('全部系列无有效点时返回空图表，并能清除基础series', () => {
    const chartData = createInboundFlowChartData(periods, {
      planInbound: { week1: 0 },
      actualInbound: { week1: null },
      achievementRate: {},
    }, chartKeys)

    expect(chartData).toEqual({ xAxisData: [], series: [] })
    expect(resolveChartOptions(departmentInboundPlanTrendChartOptions, chartData).series).toEqual([])
  })

  it('入库折线显式禁止跨空值连接', () => {
    expect(departmentInboundPlanTrendChartOptions.series?.every(
      (series) => series.connectNulls === false,
    )).toBe(true)
  })
})
