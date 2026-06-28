import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../../../components/TableChartCard.types"

const percentFormatter = (value: string | number | null | undefined): string => {
  if (typeof value === "number") {
    return `${value.toFixed(1)}%`
  }

  return typeof value === "string" ? value : "-"
}

const capacityAxisFormatter = (...args: readonly unknown[]): string => {
  const value = args[0]

  if (typeof value === "number") {
    return value === 0 ? "0" : `${value / 10000}万`
  }

  return typeof value === "string" ? value : "-"
}

export const departmentTableChartRows = [
  { key: "plan", label: "计划产能" },
  { key: "actual", label: "实际产能", tone: "success" },
  { key: "gap", label: "实际-计划", tone: "muted" },
  { key: "rate", label: "达成率", formatter: percentFormatter },
] as const satisfies readonly TableRowConfig[]

export const departmentTableChartColumns = [
  { key: "month", label: "本月", width: "minmax(142px, 1fr)" },
  { key: "toDate", label: "截至28日", width: "minmax(166px, 1fr)" },
  { key: "stamping", label: "冲压部" },
  { key: "welding", label: "焊装部" },
  { key: "painting", label: "涂装部" },
  { key: "assembly", label: "总装部" },
  { key: "quality", label: "质量部" },
] as const satisfies readonly TableColumnConfig[]

export const departmentTableChartData = {
  plan: {
    month: 512000,
    toDate: 456000,
    stamping: 92000,
    welding: 84000,
    painting: 76000,
    assembly: 152000,
    quality: 52000,
  },
  actual: {
    month: 498240,
    toDate: 443650,
    stamping: 90240,
    welding: 81550,
    painting: 73720,
    assembly: 148960,
    quality: 49180,
  },
  gap: {
    month: -13760,
    toDate: -12350,
    stamping: -1760,
    welding: -2450,
    painting: -2280,
    assembly: -3040,
    quality: -2820,
  },
  rate: {
    month: 97.3,
    toDate: 97.3,
    stamping: 98.1,
    welding: 97.1,
    painting: 97.0,
    assembly: 98.0,
    quality: 94.6,
  },
} as const satisfies TableData

export const departmentTableChartOptions = {
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
    left: 64,
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
    min: -20000,
    max: 160000,
    interval: 40000,
    axisLabel: {
      color: "#566579",
      fontSize: 14,
      formatter: capacityAxisFormatter,
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
      name: "计划产能",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "actual",
      name: "实际产能",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "gap",
      name: "实际-计划",
      type: "bar",
      barWidth: 16,
    },
    {
      id: "rate",
      name: "达成率",
      type: "line",
      smooth: true,
      symbolSize: 9,
    },
  ],
} as const satisfies ChartOptionConfig

export const departmentTableChartChartData = {
  xAxisData: ["冲压部", "焊装部", "涂装部", "总装部", "质量部"],
  series: [
    {
      id: "plan",
      data: [92000, 84000, 76000, 152000, 52000],
    },
    {
      id: "actual",
      data: [90240, 81550, 73720, 148960, 49180],
    },
    {
      id: "gap",
      data: [-1760, -2450, -2280, -3040, -2820],
    },
    {
      id: "rate",
      data: [98.1, 97.1, 97.0, 98.0, 94.6],
    },
  ],
} as const satisfies ChartDataConfig
