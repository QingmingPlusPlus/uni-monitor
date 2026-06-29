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

export const processProductionPlanTrendRows = [
  { key: "planProduction", label: "计划生产数" },
  { key: "actualProduction", label: "实绩生产数", tone: "success" },
  { key: "qualified", label: "合格数", tone: "success" },
  { key: "defective", label: "不良数", tone: "danger" },
  { key: "sampled", label: "抽样数" },
  { key: "gap", label: "实绩-计划", tone: "muted" },
  { key: "achievementRate", label: "生产达成率", formatter: percentFormatter },
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
  planProduction: {
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
  actualProduction: {
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
  qualified: {
    month: 212460,
    week1: 48072,
    week2: 50476,
    week3: 50728,
    week4: 53336,
    day11: 6618,
    day12: 6931,
    day13: 6904,
    day14: 7252,
    day15: 7005,
    day16: 7155,
    day17: 7429,
  },
  defective: {
    month: 2720,
    week1: 588,
    week2: 654,
    week3: 662,
    week4: 664,
    day11: 92,
    day12: 89,
    day13: 86,
    day14: 98,
    day15: 85,
    day16: 85,
    day17: 91,
  },
  sampled: {
    month: 11340,
    week1: 2580,
    week2: 2670,
    week3: 2740,
    week4: 2860,
    day11: 360,
    day12: 368,
    day13: 372,
    day14: 384,
    day15: 380,
    day16: 386,
    day17: 392,
  },
  gap: {
    month: -820,
    week1: -540,
    week2: 630,
    week3: -310,
    week4: 800,
    day11: -90,
    day12: 120,
    day13: -60,
    day14: 150,
    day15: -60,
    day16: -60,
    day17: 120,
  },
  achievementRate: {
    month: 99.6,
    week1: 98.9,
    week2: 101.2,
    week3: 99.4,
    week4: 101.5,
    day11: 98.7,
    day12: 101.7,
    day13: 99.1,
    day14: 102.1,
    day15: 99.2,
    day16: 99.2,
    day17: 101.6,
  },
} as const satisfies TableData

const palette = {
  planProduction: "#4F81BD",
  actualProduction: "#70AD47",
  achievementRate: "#C0504D",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

export const processProductionPlanTrendChartOptions: ChartOptionConfig = {
  color: [palette.planProduction, palette.actualProduction, palette.achievementRate],
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
  yAxis: [
    {
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
      id: "planProduction",
      name: "计划生产数",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
    },
    {
      id: "actualProduction",
      name: "实绩生产数",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
    },
    {
      id: "achievementRate",
      name: "生产达成率",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
      yAxisIndex: 1,
    },
  ],
}

export const processProductionPlanTrendChartData: ChartDataConfig = {
  xAxisData: ["11", "12", "13", "14", "15", "16", "17"],
  series: [
    {
      id: "planProduction",
      data: [6800, 6900, 7050, 7200, 7150, 7300, 7400],
    },
    {
      id: "actualProduction",
      data: [6710, 7020, 6990, 7350, 7090, 7240, 7520],
    },
    {
      id: "achievementRate",
      data: [98.7, 101.7, 99.1, 102.1, 99.2, 99.2, 101.6],
    },
  ],
}
