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

const percentAxisLabelFormatter = (value: unknown): string => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : ""
}

export const departmentInboundPlanTrendRows = [
  { key: "planInbound", label: "计划入库数" },
  { key: "actualInbound", label: "实绩入库数", tone: "success" },
  { key: "gap", label: "实绩-计划", tone: "muted" },
  { key: "achievementRate", label: "入库达成率", formatter: percentFormatter },
] as const satisfies readonly TableRowConfig[]

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
        formatter: percentAxisLabelFormatter,
      },
      splitLine: {
        show: false,
      },
    },
  ],
  series: [
    { id: "planInbound", name: "计划入库数", type: "line", smooth: false, symbol: "circle", symbolSize: 6 },
    { id: "actualInbound", name: "实绩入库数", type: "line", smooth: false, symbol: "circle", symbolSize: 6 },
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

export const defaultDepartmentInboundPlanTrendSegments = [
  { segmentIndex: 1, startDay: 1, endDay: 7 },
  { segmentIndex: 2, startDay: 8, endDay: 14 },
  { segmentIndex: 3, startDay: 15, endDay: 21 },
  { segmentIndex: 4, startDay: 22, endDay: 28 },
  { segmentIndex: 5, startDay: 29, endDay: 30 },
] as const satisfies readonly SegmentVO[]
