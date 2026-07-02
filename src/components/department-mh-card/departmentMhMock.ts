import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableCellFormatter,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"

const percentFormatter: TableCellFormatter = (value) => {
  if (typeof value === "number") {
    return `${value.toFixed(1)}%`
  }
  return typeof value === "string" ? value : "-"
}

const percentAxisLabelFormatter = (value: unknown): string => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : ""
}

/** MH 实绩 行：计划定时/平日/休日/祝日/计划合计 + 实绩定时/平日/休日/祝日/实绩合计 + 直接出勤率 */
export const departmentMhRows = [
  { key: "planRegular", label: "计划定时" },
  { key: "planWeekdayOvertime", label: "计划平日加班", tone: "warning" },
  { key: "planHolidayOvertime", label: "计划休日加班", tone: "warning" },
  { key: "planNationalHolidayOvertime", label: "计划祝日加班", tone: "warning" },
  { key: "planTotal", label: "计划合计" },
  { key: "actualRegular", label: "实绩定时", tone: "success" },
  { key: "actualWeekdayOvertime", label: "实绩平日加班", tone: "success" },
  { key: "actualHolidayOvertime", label: "实绩休日加班", tone: "success" },
  { key: "actualNationalHolidayOvertime", label: "实绩祝日加班", tone: "success" },
  { key: "actualTotal", label: "实绩合计", tone: "success" },
  { key: "directAttendanceRate", label: "直接出勤率", formatter: percentFormatter, tone: "muted" },
] as const satisfies readonly TableRowConfig[]

/** MH 实绩 列：周 */
export const departmentMhColumns = [
  { key: "week1", label: "1W", width: "minmax(140px, 1fr)" },
  { key: "week2", label: "2W", width: "minmax(140px, 1fr)" },
  { key: "week3", label: "3W", width: "minmax(140px, 1fr)" },
  { key: "week4", label: "4W", width: "minmax(140px, 1fr)" },
] as const satisfies readonly TableColumnConfig[]

function buildMhRow(
  regular: number,
  weekday: number,
  holiday: number,
  nationalHoliday: number,
): Record<string, number> {
  return {
    week1: regular,
    week2: weekday,
    week3: holiday,
    week4: nationalHoliday,
  }
}

export const departmentMhTableData = {
  planRegular: buildMhRow(6800, 6920, 7050, 7180),
  planWeekdayOvertime: buildMhRow(1200, 1180, 1240, 1260),
  planHolidayOvertime: buildMhRow(420, 460, 410, 440),
  planNationalHolidayOvertime: buildMhRow(180, 190, 210, 200),
  planTotal: buildMhRow(8600, 8750, 8910, 9080),
  actualRegular: buildMhRow(6690, 6800, 6940, 7080),
  actualWeekdayOvertime: buildMhRow(1170, 1140, 1210, 1240),
  actualHolidayOvertime: buildMhRow(410, 440, 400, 430),
  actualNationalHolidayOvertime: buildMhRow(170, 180, 200, 190),
  actualTotal: buildMhRow(8440, 8560, 8750, 8940),
  directAttendanceRate: buildMhRow(98.2, 97.8, 98.5, 98.0),
} as const satisfies TableData

const palette = {
  plan: "#4F81BD",
  actual: "#70AD47",
  rate: "#C0504D",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

export const departmentMhChartOptions: ChartOptionConfig = {
  color: [palette.plan, palette.actual, palette.rate],
  tooltip: {
    trigger: "axis",
    textStyle: { fontSize: 14 },
  },
  legend: {
    bottom: 0,
    left: "center",
    itemWidth: 14,
    itemHeight: 10,
    textStyle: { color: palette.textSecondary, fontSize: 13 },
  },
  grid: {
    left: 52,
    right: 52,
    top: 28,
    bottom: 56,
  },
  xAxis: {
    type: "category",
    axisTick: { show: false },
    axisLine: { lineStyle: { color: palette.rail } },
    axisLabel: { color: palette.textSecondary, fontSize: 12 },
  },
  yAxis: [
    {
      type: "value",
      min: 0,
      max: 10000,
      interval: 2000,
      axisLabel: { color: palette.textSecondary, fontSize: 12 },
      splitLine: { lineStyle: { color: palette.rail, type: "dashed" } },
    },
    {
      type: "value",
      min: 90,
      max: 100,
      interval: 2,
      axisLabel: { color: palette.textSecondary, fontSize: 12, formatter: percentAxisLabelFormatter },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      id: "planTotal",
      name: "计划合计",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "actualTotal",
      name: "实绩合计",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "directAttendanceRate",
      name: "直接出勤率",
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      yAxisIndex: 1,
    },
  ],
}

export const departmentMhChartData: ChartDataConfig = {
  xAxisData: ["1W", "2W", "3W", "4W"],
  series: [
    { id: "planTotal", data: [8600, 8750, 8910, 9080] },
    { id: "actualTotal", data: [8440, 8560, 8750, 8940] },
    { id: "directAttendanceRate", data: [98.2, 97.8, 98.5, 98.0] },
  ],
}
