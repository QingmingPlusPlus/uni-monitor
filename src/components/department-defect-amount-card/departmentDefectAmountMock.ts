import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"

/** 不良率计画实绩（金额）行：一行计划，一行实绩 */
export const departmentDefectAmountRows = [
  { key: "plan", label: "计划" },
  { key: "actual", label: "实绩", tone: "success" },
] as const satisfies readonly TableRowConfig[]

/** 不良率计画实绩（金额）列：周 */
export const departmentDefectAmountColumns = [
  { key: "week1", label: "1W", width: "minmax(140px, 1fr)" },
  { key: "week2", label: "2W", width: "minmax(140px, 1fr)" },
  { key: "week3", label: "3W", width: "minmax(140px, 1fr)" },
  { key: "week4", label: "4W", width: "minmax(140px, 1fr)" },
] as const satisfies readonly TableColumnConfig[]

export const departmentDefectAmountTableData = {
  plan: {
    week1: 128000,
    week2: 132400,
    week3: 141600,
    week4: 137600,
  },
  actual: {
    week1: 125820,
    week2: 130120,
    week3: 139220,
    week4: 135040,
  },
} as const satisfies TableData

const palette = {
  plan: "#2471FF",
  actual: "#22A06B",
  textSecondary: "#53657A",
  rail: "#D8E2EE",
} as const

export const departmentDefectAmountChartOptions: ChartOptionConfig = {
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
    left: 64,
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

export const departmentDefectAmountChartData: ChartDataConfig = {
  xAxisData: ["1W", "2W", "3W", "4W"],
  series: [
    { id: "plan", data: [128000, 132400, 141600, 137600] },
    { id: "actual", data: [125820, 130120, 139220, 135040] },
  ],
}