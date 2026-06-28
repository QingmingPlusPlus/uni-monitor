import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "./TableChartCard.types"

const percentFormatter = (value: string | number | null | undefined): string => {
  if (typeof value === "number") {
    return `${value.toFixed(1)}%`
  }

  return typeof value === "string" ? value : "-"
}

export const tableChartMockRows = [
  { key: "plan", label: "计划入库数" },
  { key: "actual", label: "实绩入库数", tone: "success" },
  { key: "gap", label: "实绩-计划", tone: "muted" },
  { key: "rate", label: "入库达成率", formatter: percentFormatter },
] as const satisfies readonly TableRowConfig[]

export const tableChartMockColumns = [
  { key: "month", label: "全月", width: "minmax(146px, 1fr)" },
  { key: "toDate", label: "截至28日", width: "minmax(166px, 1fr)" },
  { key: "week1", label: "1W" },
  { key: "week2", label: "2W" },
  { key: "week3", label: "3W" },
  { key: "week4", label: "4W" },
] as const satisfies readonly TableColumnConfig[]

export const tableChartMockData = {
  plan: {
    month: 600000,
    toDate: 348000,
    week1: 134400,
    week2: 141600,
    week3: 148800,
    week4: 156000,
  },
  actual: {
    month: 589200,
    toDate: 341736,
    week1: 131981,
    week2: 139051,
    week3: 146122,
    week4: 153582,
  },
  gap: {
    month: -10800,
    toDate: -6264,
    week1: -2419,
    week2: -2549,
    week3: -2678,
    week4: -2418,
  },
  rate: {
    month: 98.2,
    toDate: 98.2,
    week1: 98.2,
    week2: 98.2,
    week3: 98.2,
    week4: 98.4,
  },
} as const satisfies TableData

export const tableChartMockOptions = {
  color: ["#126B72", "#15905D", "#566579", "#B7791F"],
  tooltip: {
    trigger: "axis",
    textStyle: {
      fontSize: 16,
    },
  },
  legend: {
    top: 0,
    left: 0,
    itemWidth: 14,
    itemHeight: 10,
    textStyle: {
      color: "#566579",
      fontSize: 15,
    },
  },
  grid: {
    left: 68,
    right: 24,
    top: 58,
    bottom: 46,
  },
  xAxis: {
    type: "category",
    axisTick: {
      show: false,
    },
    axisLine: {
      lineStyle: {
        color: "#D8E1EB",
      },
    },
    axisLabel: {
      color: "#566579",
      fontSize: 14,
    },
  },
  yAxis: {
    type: "value",
    min: -100000,
    max: 600000,
    interval: 100000,
    axisLabel: {
      color: "#566579",
      fontSize: 14,
    },
    splitLine: {
      lineStyle: {
        color: "#D8E1EB",
        type: "dashed",
      },
    },
  },
  series: [
    {
      id: "plan",
      name: "计划入库数",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "actual",
      name: "实绩入库数",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "gap",
      name: "实绩-计划",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "rate",
      name: "入库达成率",
      type: "line",
      smooth: true,
      symbolSize: 9,
    },
  ],
} as const satisfies ChartOptionConfig

export const tableChartMockChartData = {
  xAxisData: ["全月", "1W", "3W", "6/22", "6/24", "6/26", "6/28"],
  series: [
    {
      id: "plan",
      data: [600000, 134400, 148800, 151200, 153600, 154800, 156000],
    },
    {
      id: "actual",
      data: [589200, 131981, 146122, 148176, 150528, 152390, 153582],
    },
    {
      id: "gap",
      data: [-10800, -2419, -2678, -3024, -3072, -2410, -2418],
    },
    {
      id: "rate",
      data: [98.2, 98.2, 98.2, 98.0, 98.0, 98.4, 98.4],
    },
  ],
} as const satisfies ChartDataConfig
