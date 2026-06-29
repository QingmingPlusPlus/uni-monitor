import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"

/** 不良率计画实绩（个数）行：一行计划，一行实绩 */
export const departmentDefectCountRows = [
  { key: "plan", label: "计划" },
  { key: "actual", label: "实绩", tone: "success" },
] as const satisfies readonly TableRowConfig[]

/** 不良率计画实绩（个数）列：周 */
export const departmentDefectCountColumns = [
  { key: "week1", label: "1W", width: "minmax(140px, 1fr)" },
  { key: "week2", label: "2W", width: "minmax(140px, 1fr)" },
  { key: "week3", label: "3W", width: "minmax(140px, 1fr)" },
  { key: "week4", label: "4W", width: "minmax(140px, 1fr)" },
] as const satisfies readonly TableColumnConfig[]

export const departmentDefectCountTableData = {
  plan: {
    week1: 3840,
    week2: 4120,
    week3: 4280,
    week4: 3960,
  },
  actual: {
    week1: 3795,
    week2: 4060,
    week3: 4182,
    week4: 3914,
  },
} as const satisfies TableData

const palette = {
  plan: "#2471FF",
  actual: "#22A06B",
  textSecondary: "#53657A",
  rail: "#D8E2EE",
} as const

export const departmentDefectCountChartOptions: ChartOptionConfig = {
  color: [palette.plan, palette.actual],
  tooltip: {
    trigger: "axis",
    textStyle: { fontSize: 15 },
  },
  legend: {
    top: 0,
    left: 0,
    itemWidth: 14,
    itemHeight: 10,
    textStyle: { color: palette.textSecondary, fontSize: 14 },
  },
  grid: {
    left: 56,
    right: 24,
    top: 48,
    bottom: 40,
  },
  xAxis: {
    type: "category",
    axisTick: { show: false },
    axisLine: { lineStyle: { color: palette.rail } },
    axisLabel: { color: palette.textSecondary, fontSize: 13 },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: palette.textSecondary, fontSize: 13 },
    splitLine: { lineStyle: { color: palette.rail, type: "dashed" } },
  },
  series: [
    { id: "plan", name: "计划", type: "bar", barWidth: 18 },
    { id: "actual", name: "实绩", type: "bar", barWidth: 18 },
  ],
}

export const departmentDefectCountChartData: ChartDataConfig = {
  xAxisData: ["1W", "2W", "3W", "4W"],
  series: [
    { id: "plan", data: [3840, 4120, 4280, 3960] },
    { id: "actual", data: [3795, 4060, 4182, 3914] },
  ],
}