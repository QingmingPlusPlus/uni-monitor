import type { SegmentVO } from "../../api/basic"
import type {
  ChartOptionConfig,
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

export const attendanceTrendPalette = {
  directCount: "#5B9BD5",
  directAttendance: "#ED7D31",
  indirectCount: "#FFC000",
  directRate: "#4472C4",
  targetRate: "#C00000",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

function isChartValueRecord(value: unknown): value is { readonly value?: unknown } {
  return typeof value === "object" && value !== null
}

export const attendanceTrendChartOptions: ChartOptionConfig = {
  color: [
    attendanceTrendPalette.directCount,
    attendanceTrendPalette.directAttendance,
    attendanceTrendPalette.indirectCount,
    attendanceTrendPalette.directRate,
    attendanceTrendPalette.targetRate,
  ],
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
      color: attendanceTrendPalette.textSecondary,
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
        color: attendanceTrendPalette.rail,
      },
    },
    axisLabel: {
      color: attendanceTrendPalette.textSecondary,
      fontSize: 12,
    },
  },
  yAxis: [
    {
      type: "value",
      min: 0,
      axisLabel: {
        color: attendanceTrendPalette.textSecondary,
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: attendanceTrendPalette.rail,
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
        color: attendanceTrendPalette.textSecondary,
        fontSize: 12,
        formatter: "{value}%",
      },
      splitLine: {
        show: false,
      },
    },
  ],
  series: [
    { id: "directCount", name: "直接在籍人数", type: "bar", barWidth: 12 },
    { id: "directAttendance", name: "直接出勤人数", type: "bar", barWidth: 12 },
    { id: "indirectCount", name: "间接在籍人数", type: "bar", barWidth: 12 },
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
        color: attendanceTrendPalette.directRate,
        fontSize: 11,
        formatter: (params: unknown): string => {
          if (!isChartValueRecord(params)) {
            return ""
          }

          const value = typeof params.value === "number" ? params.value : 0

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

export const defaultAttendanceTrendSegments = [
  { segmentIndex: 1, startDay: 1, endDay: 7 },
  { segmentIndex: 2, startDay: 8, endDay: 14 },
  { segmentIndex: 3, startDay: 15, endDay: 21 },
  { segmentIndex: 4, startDay: 22, endDay: 28 },
  { segmentIndex: 5, startDay: 29, endDay: 30 },
] as const satisfies readonly SegmentVO[]
