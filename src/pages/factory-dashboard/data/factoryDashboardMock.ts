import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from '../../../components/table-chart-card/TableChartCard.types'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  getCssMapDepartmentLabel,
  getCssMapProcessLabel,
} from '../../../components/css-map/css3dMapSelection'
import type {
  FactoryDashboardCard,
  FactoryDashboardData,
  FactoryKpiItem,
} from './factoryDashboardTypes'
import { createPersonnelAttendanceData } from './factoryAttendanceMock'

const percentFormatter = (value: string | number | null | undefined): string => {
  if (typeof value === 'number') {
    return `${value.toFixed(1)}%`
  }

  return typeof value === 'string' ? value : '-'
}

const numberFormatter = new Intl.NumberFormat('en-US')

const dashboardRows = [
  { key: 'plan', label: '计划' },
  { key: 'actual', label: '实绩', tone: 'success' },
  { key: 'gap', label: '差异', tone: 'muted' },
  { key: 'rate', label: '达成率', formatter: percentFormatter },
] as const satisfies readonly TableRowConfig[]

const dashboardColumns = [
  { key: 'month', label: '全月', width: 'minmax(128px, 1fr)' },
  { key: 'toDate', label: '截至28日', width: 'minmax(148px, 1fr)' },
  { key: 'week1', label: '1W' },
  { key: 'week2', label: '2W' },
  { key: 'week3', label: '3W' },
  { key: 'week4', label: '4W' },
] as const satisfies readonly TableColumnConfig[]

const chartPalette = {
  operation: '#2471FF',
  success: '#22A06B',
  warning: '#F5B638',
  danger: '#E55353',
  textSecondary: '#53657A',
  rail: '#D8E2EE',
} as const

interface CardSeed {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly base: number
  readonly unit: 'count' | 'minute'
}

function createTableData(seed: CardSeed): TableData {
  const actual = Math.round(seed.base * 0.982)
  const gap = actual - seed.base
  const weekBase = Math.round(seed.base / 4)

  return {
    plan: {
      month: seed.base,
      toDate: Math.round(seed.base * 0.58),
      week1: weekBase,
      week2: weekBase + 320,
      week3: weekBase + 620,
      week4: weekBase + 880,
    },
    actual: {
      month: actual,
      toDate: Math.round(actual * 0.58),
      week1: Math.round(weekBase * 0.97),
      week2: Math.round((weekBase + 320) * 0.98),
      week3: Math.round((weekBase + 620) * 0.99),
      week4: Math.round((weekBase + 880) * 0.985),
    },
    gap: {
      month: gap,
      toDate: Math.round(gap * 0.58),
      week1: -Math.round(weekBase * 0.03),
      week2: -Math.round(weekBase * 0.02),
      week3: -Math.round(weekBase * 0.01),
      week4: -Math.round(weekBase * 0.015),
    },
    rate: {
      month: 98.2,
      toDate: 98.2,
      week1: 97.1,
      week2: 98.0,
      week3: 99.0,
      week4: 98.5,
    },
  }
}

function createChartOptions(seed: CardSeed): ChartOptionConfig {
  return {
    color: [chartPalette.operation, chartPalette.success, chartPalette.danger, chartPalette.warning],
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 16 },
    },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 14,
      itemHeight: 10,
      textStyle: {
        color: chartPalette.textSecondary,
        fontSize: 15,
      },
    },
    grid: {
      left: seed.unit === 'minute' ? 76 : 68,
      right: 20,
      top: 54,
      bottom: 42,
    },
    xAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLine: { lineStyle: { color: chartPalette.rail } },
      axisLabel: {
        color: chartPalette.textSecondary,
        fontSize: 14,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: chartPalette.textSecondary,
        fontSize: 14,
      },
      splitLine: {
        lineStyle: {
          color: chartPalette.rail,
          type: 'dashed',
        },
      },
    },
    series: [
      { id: 'plan', name: '计划', type: 'bar', barWidth: 16 },
      { id: 'actual', name: '实绩', type: 'bar', barWidth: 16 },
      { id: 'gap', name: '差异', type: 'bar', barWidth: 16 },
      { id: 'rate', name: '达成率', type: 'line', smooth: true, symbolSize: 9 },
    ],
  }
}

function createChartData(seed: CardSeed): ChartDataConfig {
  const weekBase = Math.round(seed.base / 4)

  return {
    xAxisData: ['全月', '1W', '2W', '3W', '4W', '6/27', '6/28'],
    series: [
      { id: 'plan', data: [seed.base, weekBase, weekBase + 320, weekBase + 620, weekBase + 880, 0, 0] },
      { id: 'actual', data: [Math.round(seed.base * 0.982), Math.round(weekBase * 0.97), Math.round((weekBase + 320) * 0.98), Math.round((weekBase + 620) * 0.99), Math.round((weekBase + 880) * 0.985), 0, 0] },
      { id: 'gap', data: [-Math.round(seed.base * 0.018), -Math.round(weekBase * 0.03), -Math.round(weekBase * 0.02), -Math.round(weekBase * 0.01), -Math.round(weekBase * 0.015), 0, 0] },
      { id: 'rate', data: [98.2, 97.1, 98.0, 99.0, 98.5, 100, 100] },
    ],
  }
}

function createDashboardCard(seed: CardSeed): FactoryDashboardCard {
  return {
    id: seed.id,
    title: seed.title,
    subtitle: seed.subtitle,
    tableRows: dashboardRows,
    tableColumns: dashboardColumns,
    tableData: createTableData(seed),
    chartOptions: createChartOptions(seed),
    chartData: createChartData(seed),
  }
}

function createKpis(scopeLabel: string, seed: number): readonly FactoryKpiItem[] {
  return [
    { label: '计划数', value: numberFormatter.format(seed * 1024), note: scopeLabel, tone: 'operation' },
    { label: '实绩数', value: numberFormatter.format(Math.round(seed * 1005.2)), note: '截至 06-28', tone: 'success' },
    { label: '达成率', value: '98.2%', note: 'Mock 数据', tone: 'success' },
    { label: '平均负荷率', value: '43.8%', note: '设备日历', tone: 'warning' },
    { label: '稼动设备', value: '273/289', note: '在线/总数', tone: 'operation' },
    { label: '在岗人数', value: '187', note: '当班配置', tone: 'neutral' },
  ]
}

export function getDepartmentDashboardData(
  value: CssMapDepartmentValue,
  selectionConfig: CssMapSelectionConfig = defaultCssMapSelectionConfig,
  refreshedAt: Date = new Date(),
): FactoryDashboardData {
  const label = getCssMapDepartmentLabel(value, selectionConfig)

  return {
    kind: 'department',
    eyebrow: `部门维度 · 2026-06 · ${label}`,
    title: `${label} 展示计划`,
    subtitle: '部门口径汇总计划、实绩、人员配置与产能负荷，当前为 Mock 数据。',
    kpis: createKpis(label, 2929),
    attendance: createPersonnelAttendanceData(value, selectionConfig, refreshedAt),
    cards: [
      createDashboardCard({ id: 'staff-plan', title: '人员配置', subtitle: '按部门、工序、班次和人时统计', base: 461, unit: 'count' }),
      createDashboardCard({ id: 'production-pulse', title: '生产性活动', subtitle: '稼动、停线、换型和清扫活动', base: 2969, unit: 'minute' }),
      createDashboardCard({ id: 'plan-result', title: '生产计划实绩', subtitle: '计划、实绩、差异与达成率', base: 2989512, unit: 'count' }),
      createDashboardCard({ id: 'sync-plan', title: '可动率、阻碍时间与改善计划', subtitle: '可动率目标、损失时间和改善趋势', base: 48647, unit: 'minute' }),
    ],
  }
}

export function getProcessDashboardData(
  value: CssMapProcessValue,
  selectionConfig: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): FactoryDashboardData {
  const label = getCssMapProcessLabel(value, selectionConfig)

  return {
    kind: 'process',
    eyebrow: `工序维度 · 2026-06 · ${label}`,
    title: `${label} 展示计划`,
    subtitle: '工序口径聚焦当前流程的人员、产出、计划与异常阻碍。',
    kpis: createKpis(label, 2969).slice(0, 6),
    cards: [
      createDashboardCard({ id: 'process-staff', title: '人员配置', subtitle: '工序内人员、班次和标准人时', base: 461, unit: 'count' }),
      createDashboardCard({ id: 'process-attendance', title: '人员出勤', subtitle: '工序内出勤和临时支援记录', base: 432, unit: 'count' }),
      createDashboardCard({ id: 'process-activity', title: '生产性活动', subtitle: '稼动、清扫、异常和切替活动', base: 2969, unit: 'minute' }),
      createDashboardCard({ id: 'process-plan', title: '生产计划实绩', subtitle: '工序计划、实绩与达成率', base: 155160, unit: 'count' }),
    ],
  }
}
