import type { ChartOptionConfig } from '../../../../components/table-chart-card/TableChartCard.types'

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
  yAxis: {
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

