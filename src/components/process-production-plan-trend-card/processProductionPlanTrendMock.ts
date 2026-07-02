import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"

export const processProductionPlanTrendRows = [
  { key: "plan", label: "计划生产数" },
  { key: "actual", label: "实绩生产数", tone: "success" },
] as const satisfies readonly TableRowConfig[]

export const processProductionPlanTrendColumns = [
  { key: "month", label: "5月", width: "minmax(120px, 1fr)" },
  { key: "week1", label: "1W" },
  { key: "week2", label: "2W" },
  { key: "week3", label: "3W" },
  { key: "week4", label: "4W" },
  { key: "day11", label: "11" },
  { key: "day12", label: "12" },
  { key: "day13", label: "13" },
  { key: "day14", label: "14" },
  { key: "day15", label: "15" },
  { key: "day16", label: "16" },
  { key: "day17", label: "17" },
] as const satisfies readonly TableColumnConfig[]

export const processProductionPlanTrendTableData = {
  plan: {
    month: 216000,
    week1: 49200,
    week2: 50500,
    week3: 51700,
    week4: 53200,
    day11: 6800,
    day12: 6900,
    day13: 7050,
    day14: 7200,
    day15: 7150,
    day16: 7300,
    day17: 7400,
  },
  actual: {
    month: 215180,
    week1: 48660,
    week2: 51130,
    week3: 51390,
    week4: 54000,
    day11: 6710,
    day12: 7020,
    day13: 6990,
    day14: 7350,
    day15: 7090,
    day16: 7240,
    day17: 7520,
  },
} as const satisfies TableData

const palette = {
  planProduction: "#4F81BD",
  actualProduction: "#70AD47",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

export const processProductionPlanTrendChartOptions: ChartOptionConfig = {
  color: [palette.planProduction, palette.actualProduction],
  tooltip: {
    trigger: "axis",
    textStyle: {
      fontSize: 14,
    },
  },
  legend: {
    bottom: 0,
    left: "center",
    itemWidth: 14,
    itemHeight: 10,
    textStyle: {
      color: palette.textSecondary,
      fontSize: 13,
    },
  },
  grid: {
    left: 52,
    right: 52,
    top: 28,
    bottom: 56,
  },
  xAxis: {
    type: "category",
    axisTick: {
      show: false,
    },
    axisLine: {
      lineStyle: {
        color: palette.rail,
      },
    },
    axisLabel: {
      color: palette.textSecondary,
      fontSize: 12,
    },
  },
  yAxis: {
    type: "value",
    min: 0,
    max: 8000,
    interval: 2000,
    axisLabel: {
      color: palette.textSecondary,
      fontSize: 12,
    },
    splitLine: {
      lineStyle: {
        color: palette.rail,
        type: "dashed",
      },
    },
  },
  series: [
    {
      id: "plan",
      name: "计划",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
    },
    {
      id: "actual",
      name: "实绩",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
    },
  ],
}

export const processProductionPlanTrendChartData: ChartDataConfig = {
  xAxisData: ["11", "12", "13", "14", "15", "16", "17"],
  series: [
    {
      id: "plan",
      data: [6800, 6900, 7050, 7200, 7150, 7300, 7400],
    },
    {
      id: "actual",
      data: [6710, 7020, 6990, 7350, 7090, 7240, 7520],
    },
  ],
}
