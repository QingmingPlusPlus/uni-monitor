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

export const attendanceTrendRows = [
  { key: "indirectCount", label: "间接在籍人数" },
  { key: "directCount", label: "直接在籍人数" },
  { key: "directAttendance", label: "直接出勤人数" },
  { key: "directRate", label: "直接实际出勤率", formatter: percentFormatter },
  { key: "targetRate", label: "利记出勤率", formatter: percentFormatter },
] as const satisfies readonly TableRowConfig[]

export const attendanceTrendColumns = [
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

export const attendanceTrendTableData = {
  indirectCount: {
    month: 3,
    week1: 3,
    week2: 3,
    week3: 3,
    week4: 3,
    day11: 3,
    day12: 3,
    day13: 3,
    day14: 3,
    day15: 3,
    day16: 3,
    day17: 3,
  },
  directCount: {
    month: 73,
    week1: 73,
    week2: 73,
    week3: 73,
    week4: 73,
    day11: 73,
    day12: 73,
    day13: 72,
    day14: 72,
    day15: 72,
    day16: 72,
    day17: 72,
  },
  directAttendance: {
    month: 62,
    week1: 56,
    week2: 68,
    week3: 0,
    week4: 0,
    day11: 70,
    day12: 65,
    day13: 66,
    day14: 68,
    day15: 71,
    day16: 0,
    day17: 0,
  },
  directRate: {
    month: 92.9,
    week1: 92.1,
    week2: 93.9,
    week3: 0,
    week4: 0,
    day11: 95.9,
    day12: 89.0,
    day13: 91.7,
    day14: 94.4,
    day15: 98.6,
    day16: 0,
    day17: 0,
  },
  targetRate: {
    month: 91,
    week1: 91,
    week2: 91,
    week3: 91,
    week4: 91,
    day11: 91,
    day12: 91,
    day13: 91,
    day14: 91,
    day15: 91,
    day16: 91,
    day17: 91,
  },
} as const satisfies TableData

const palette = {
  directCount: "#5B9BD5",
  directAttendance: "#ED7D31",
  indirectCount: "#FFC000",
  directRate: "#4472C4",
  targetRate: "#C00000",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

export const attendanceTrendChartOptions: ChartOptionConfig = {
  color: [palette.directCount, palette.directAttendance, palette.indirectCount, palette.directRate, palette.targetRate],
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
    right: 48,
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
      max: 160,
      interval: 40,
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
      min: 0,
      max: 100,
      interval: 20,
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
      id: "directCount",
      name: "直接在籍人数",
      type: "bar",
      barWidth: 12,
    },
    {
      id: "directAttendance",
      name: "直接出勤人数",
      type: "bar",
      barWidth: 12,
    },
    {
      id: "indirectCount",
      name: "间接在籍人数",
      type: "bar",
      barWidth: 12,
    },
    {
      id: "directRate",
      name: "直接实际出勤率",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
      yAxisIndex: 1,
      label: {
        show: true,
        position: "top",
        color: palette.directRate,
        fontSize: 11,
        formatter: (params: unknown): string => {
          const record = params as { value?: number }
          const value = record.value ?? 0

          return value > 0 ? `${value.toFixed(1)}%` : ""
        },
      },
    },
    {
      id: "targetRate",
      name: "利记出勤率",
      type: "line",
      yAxisIndex: 1,
      symbol: "none",
      lineStyle: {
        type: "dashed",
        width: 2,
      },
      markLine: undefined,
    },
  ],
} as const satisfies ChartOptionConfig

export const attendanceTrendChartData: ChartDataConfig = {
  xAxisData: ["5月", "1W", "2W", "3W", "4W", "11", "12", "13", "14", "15", "16", "17"],
  series: [
    {
      id: "directCount",
      data: [73, 73, 73, 73, 73, 73, 73, 72, 72, 72, 72, 72],
    },
    {
      id: "directAttendance",
      data: [62, 56, 68, 0, 0, 70, 65, 66, 68, 71, 0, 0],
    },
    {
      id: "indirectCount",
      data: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    },
    {
      id: "directRate",
      data: [92.9, 92.1, 93.9, 0, 0, 95.9, 89.0, 91.7, 94.4, 98.6, 0, 0],
    },
    {
      id: "targetRate",
      data: [91, 91, 91, 91, 91, 91, 91, 91, 91, 91, 91, 91],
    },
  ],
}

export const attendanceTrendPalette = palette
