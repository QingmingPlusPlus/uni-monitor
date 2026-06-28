import type {
  ChartAxisOption,
  ChartDataConfig,
  ChartOptionConfig,
  ChartSeriesOption,
  TableCellAlign,
  TableCellValue,
  TableColumnConfig,
  TableData,
  TableRowConfig,
  TableRowTone,
} from "./TableChartCard.types"

const EMPTY_CELL_TEXT = "-"

const TABLE_ALIGN_CLASSES: Readonly<Record<TableCellAlign, string>> = {
  start: "data-table__cell--start",
  center: "data-table__cell--center",
  end: "data-table__cell--end",
}

const TABLE_ROW_TONE_CLASSES: Readonly<Record<TableRowTone, string>> = {
  normal: "data-table__row--normal",
  success: "data-table__row--success",
  warning: "data-table__row--warning",
  danger: "data-table__row--danger",
  muted: "data-table__row--muted",
}

const numberFormatter = new Intl.NumberFormat("en-US")

export function getCellText(
  row: TableRowConfig,
  column: TableColumnConfig,
  tableData: TableData,
): string {
  const value = tableData[row.key]?.[column.key]
  const formatter = row.formatter ?? column.formatter

  if (formatter !== undefined) {
    return formatter(value, { row, column })
  }

  return formatCellValue(value)
}

export function formatCellValue(value: TableCellValue): string {
  if (value === null || value === undefined || value === "") {
    return EMPTY_CELL_TEXT
  }

  if (typeof value === "number") {
    return numberFormatter.format(value)
  }

  return value
}

export function getCellAlignClass(align: TableCellAlign | undefined): string {
  return TABLE_ALIGN_CLASSES[align ?? "end"]
}

export function getRowToneClass(tone: TableRowTone | undefined): string {
  return TABLE_ROW_TONE_CLASSES[tone ?? "normal"]
}

export function resolveChartOptions(
  chartOptions: ChartOptionConfig,
  chartData: ChartDataConfig | undefined,
): ChartOptionConfig {
  if (chartData === undefined) {
    return chartOptions
  }

  return {
    ...chartOptions,
    dataset: chartData.dataset ?? chartOptions.dataset,
    xAxis: resolveXAxis(chartOptions.xAxis, chartData.xAxisData),
    series: resolveSeries(chartOptions.series, chartData.series),
  }
}

export function hasRenderableChartData(chartData: ChartDataConfig | undefined): boolean {
  if (chartData === undefined) {
    return false
  }

  if (chartData.dataset !== undefined) {
    return true
  }

  if ((chartData.xAxisData?.length ?? 0) > 0) {
    return true
  }

  return chartData.series?.some((series) => (series.data?.length ?? 0) > 0) ?? false
}

function resolveXAxis(
  xAxis: ChartOptionConfig["xAxis"],
  xAxisData: ChartDataConfig["xAxisData"],
): ChartOptionConfig["xAxis"] {
  if (xAxisData === undefined) {
    return xAxis
  }

  if (isAxisList(xAxis)) {
    const [firstAxis, ...remainingAxis] = xAxis
    const nextFirstAxis = resolveSingleXAxis(firstAxis, xAxisData)

    return [nextFirstAxis, ...remainingAxis]
  }

  return resolveSingleXAxis(xAxis, xAxisData)
}

function isAxisList(xAxis: ChartOptionConfig["xAxis"]): xAxis is readonly ChartAxisOption[] {
  return Array.isArray(xAxis)
}

function resolveSingleXAxis(
  xAxis: ChartAxisOption | undefined,
  xAxisData: ChartDataConfig["xAxisData"],
): ChartAxisOption {
  return {
    type: "category",
    ...xAxis,
    data: xAxisData,
  }
}

function resolveSeries(
  baseSeries: ChartOptionConfig["series"],
  dataSeries: ChartDataConfig["series"],
): ChartOptionConfig["series"] {
  if (dataSeries === undefined) {
    return baseSeries
  }

  return dataSeries.map((series, index) => {
    const base = findBaseSeries(baseSeries, series, index)

    return {
      ...base,
      ...series,
    }
  })
}

function findBaseSeries(
  baseSeries: ChartOptionConfig["series"],
  nextSeries: ChartSeriesOption,
  index: number,
): ChartSeriesOption | undefined {
  const byId = nextSeries.id === undefined
    ? undefined
    : baseSeries?.find((series) => series.id === nextSeries.id)

  if (byId !== undefined) {
    return byId
  }

  const byName = nextSeries.name === undefined
    ? undefined
    : baseSeries?.find((series) => series.name === nextSeries.name)

  return byName ?? baseSeries?.[index]
}
