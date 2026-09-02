import type {
  ChartOptionConfig,
  TableCellFormatter,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"

export type ProductionTrendMockShift = "day" | "middle" | "night"

export interface ProductionTrendMockDaySeed {
  readonly planCount: number
  readonly actualCount: number
  readonly actualDirectMh: number
}

export const productionTrendMockDaySeeds = [
  { planCount: 6800, actualCount: 6710, actualDirectMh: 63.5 },
  { planCount: 6900, actualCount: 7020, actualDirectMh: 65.0 },
  { planCount: 7050, actualCount: 6990, actualDirectMh: 64.0 },
  { planCount: 7200, actualCount: 7350, actualDirectMh: 66.0 },
  { planCount: 7150, actualCount: 7090, actualDirectMh: 64.5 },
  { planCount: 7300, actualCount: 7240, actualDirectMh: 65.5 },
  { planCount: 7400, actualCount: 7520, actualDirectMh: 67.0 },
] as const satisfies readonly ProductionTrendMockDaySeed[]

export const productionTrendMockShiftWeights = [
  { shift: "day", weight: 0.4 },
  { shift: "middle", weight: 0.35 },
  { shift: "night", weight: 0.25 },
] as const satisfies readonly {
  readonly shift: ProductionTrendMockShift
  readonly weight: number
}[]

export const productionTrendMockBaseCapacity = 6800
export const productionTrendMockBaselineHeadcount = 64

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export const productionTrendIntegerFormatter: TableCellFormatter = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return integerFormatter.format(Math.round(value))
  }

  return typeof value === "string" ? value : "-"
}

export const productionTrendOneDecimalFormatter: TableCellFormatter = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(1)
  }

  return typeof value === "string" ? value : "-"
}

export function createProductionPlanTrendRows(
  quantityLabel: string,
): readonly TableRowConfig[] {
  return [
    {
      key: "planCount",
      label: `计划${quantityLabel}`,
      formatter: productionTrendIntegerFormatter,
    },
    {
      key: "actualCount",
      label: `实绩${quantityLabel}`,
      formatter: productionTrendIntegerFormatter,
      tone: "success",
    },
    {
      key: "planMh",
      label: "计划MH",
      formatter: productionTrendOneDecimalFormatter,
    },
    {
      key: "actualMh",
      label: "实绩MH",
      formatter: productionTrendOneDecimalFormatter,
      tone: "success",
    },
    {
      key: "planProductivity",
      label: "计划个数生产性",
      formatter: productionTrendOneDecimalFormatter,
    },
    {
      key: "actualProductivity",
      label: "实绩个数生产性",
      formatter: productionTrendOneDecimalFormatter,
      tone: "success",
    },
  ]
}

const palette = {
  planCount: "#4F81BD",
  actualCount: "#70AD47",
  planProductivity: "#ED7D31",
  actualProductivity: "#A64CA6",
  textSecondary: "#566579",
  rail: "#D8E1EB",
} as const

function formatAxisOneDecimal(value: unknown): string {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : ""
}

function formatCountTooltip(value: unknown): string {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)} 千个` : "-"
}

function formatProductivityTooltip(value: unknown): string {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)} 个/MH` : "-"
}

export function createProductionPlanTrendChartOptions(
  chartQuantityLabel: string,
): ChartOptionConfig {
  return {
    color: [
      palette.planCount,
      palette.actualCount,
      palette.planProductivity,
      palette.actualProductivity,
    ],
    tooltip: {
      trigger: "axis",
      textStyle: {
        fontSize: 14,
      },
    },
    legend: {
      type: "scroll",
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
      left: 64,
      right: 72,
      top: 38,
      bottom: 58,
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
        name: "千个",
        nameTextStyle: {
          color: palette.textSecondary,
          fontSize: 12,
        },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 12,
          formatter: formatAxisOneDecimal,
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
        name: "个/MH",
        nameTextStyle: {
          color: palette.textSecondary,
          fontSize: 12,
        },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 12,
          formatter: formatAxisOneDecimal,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        id: "planCount",
        name: `计划${chartQuantityLabel}`,
        type: "bar",
        barWidth: 14,
        tooltip: { valueFormatter: formatCountTooltip },
      },
      {
        id: "actualCount",
        name: `实绩${chartQuantityLabel}`,
        type: "bar",
        barWidth: 14,
        tooltip: { valueFormatter: formatCountTooltip },
      },
      {
        id: "planProductivity",
        name: "计划个数生产性",
        type: "line",
        smooth: false,
        symbol: "circle",
        symbolSize: 6,
        yAxisIndex: 1,
        tooltip: { valueFormatter: formatProductivityTooltip },
      },
      {
        id: "actualProductivity",
        name: "实绩个数生产性",
        type: "line",
        smooth: false,
        symbol: "circle",
        symbolSize: 6,
        yAxisIndex: 1,
        tooltip: { valueFormatter: formatProductivityTooltip },
      },
    ],
  }
}
