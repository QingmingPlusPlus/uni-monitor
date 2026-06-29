import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"

const percentFormatter = (value: string | number | null | undefined): string => {
  if (typeof value === "number") {
    return `${value.toFixed(1)}%`
  }

  return typeof value === "string" ? value : "-"
}

export const departmentInboundPlanTrendRows = [
  { key: "planInbound", label: "计划入库数" },
  { key: "actualInbound", label: "实绩入库数", tone: "success" },
  { key: "gap", label: "实绩-计划", tone: "muted" },
  { key: "achievementRate", label: "入库达成率", formatter: percentFormatter },
] as const satisfies readonly TableRowConfig[]

export const departmentInboundPlanTrendColumns = [
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

export const departmentInboundPlanTrendTableData = {
  planInbound: {
    month: 410000,
    week1: 94000,
    week2: 96400,
    week3: 98500,
    week4: 101100,
    day11: 12800,
    day12: 13200,
    day13: 13000,
    day14: 13600,
    day15: 13800,
    day16: 14200,
    day17: 14600,
  },
  actualInbound: {
    month: 407360,
    week1: 91820,
    week2: 97320,
    week3: 99110,
    week4: 100210,
    day11: 12540,
    day12: 13480,
    day13: 12920,
    day14: 13940,
    day15: 13710,
    day16: 14060,
    day17: 14890,
  },
  gap: {
    month: -2640,
    week1: -2180,
    week2: 920,
    week3: 610,
    week4: -890,
    day11: -260,
    day12: 280,
    day13: -80,
    day14: 340,
    day15: -90,
    day16: -140,
    day17: 290,
  },
  achievementRate: {
    month: 99.4,
    week1: 97.7,
    week2: 101.0,
    week3: 100.6,
    week4: 99.1,
    day11: 98.0,
    day12: 102.1,
    day13: 99.4,
    day14: 102.5,
    day15: 99.3,
    day16: 99.0,
    day17: 102.0,
  },
} as const satisfies TableData

const palette = {
  planInbound: "#4F81BD",
  actualInbound: "#70AD47",
  achievementRate: "#C0504D",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

export const departmentInboundPlanTrendChartOptions: ChartOptionConfig = {
  color: [palette.planInbound, palette.actualInbound, palette.achievementRate],
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
    left: 58,
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
  yAxis: [
    {
      type: "value",
      min: 0,
      max: 16000,
      interval: 4000,
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
    {
      type: "value",
      min: 90,
      max: 110,
      interval: 5,
      axisLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        formatter: "{value}%",
      },
      splitLine: {
        show: false,
      },
    },
  ],
  series: [
    {
      id: "planInbound",
      name: "计划入库数",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
    },
    {
      id: "actualInbound",
      name: "实绩入库数",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
    },
    {
      id: "achievementRate",
      name: "入库达成率",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
      yAxisIndex: 1,
    },
  ],
}

export const departmentInboundPlanTrendChartData: ChartDataConfig = {
  xAxisData: ["11", "12", "13", "14", "15", "16", "17"],
  series: [
    {
      id: "planInbound",
      data: [12800, 13200, 13000, 13600, 13800, 14200, 14600],
    },
    {
      id: "actualInbound",
      data: [12540, 13480, 12920, 13940, 13710, 14060, 14890],
    },
    {
      id: "achievementRate",
      data: [98.0, 102.1, 99.4, 102.5, 99.3, 99.0, 102.0],
    },
  ],
}
