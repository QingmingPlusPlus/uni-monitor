export const TABLE_CELL_ALIGNS = ["start", "center", "end"] as const
export type TableCellAlign = (typeof TABLE_CELL_ALIGNS)[number]

export const TABLE_ROW_TONES = ["normal", "success", "warning", "danger", "muted"] as const
export type TableRowTone = (typeof TABLE_ROW_TONES)[number]

export type TableCellValue = string | number | null | undefined

export type TableCellContext = {
  readonly row: TableRowConfig
  readonly column: TableColumnConfig
}

export type TableCellFormatter = (
  value: TableCellValue,
  context: TableCellContext,
) => string

export type TableRowConfig = {
  readonly key: string
  readonly label: string
  readonly unit?: string
  readonly tone?: TableRowTone
  readonly formatter?: TableCellFormatter
}

export type TableColumnConfig = {
  readonly key: string
  readonly label: string
  readonly width?: string
  readonly align?: TableCellAlign
  readonly formatter?: TableCellFormatter
}

export type TableData = Readonly<Record<string, Readonly<Record<string, TableCellValue>>>>

export type ChartScalar = string | number | boolean | null | undefined
export type ChartCallback = (...args: readonly unknown[]) => unknown
export type ChartValue =
  | ChartScalar
  | ChartCallback
  | readonly ChartValue[]
  | { readonly [key: string]: ChartValue }

export type ChartAxisOption = {
  readonly type?: string
  readonly data?: readonly ChartValue[]
  readonly [key: string]: ChartValue
}

export type ChartSeriesOption = {
  readonly id?: string | number
  readonly name?: string
  readonly type?: string
  readonly data?: readonly ChartValue[]
  readonly [key: string]: ChartValue
}

export type ChartOptionConfig = {
  readonly dataset?: ChartValue
  readonly xAxis?: ChartAxisOption | readonly ChartAxisOption[]
  readonly yAxis?: ChartValue
  readonly series?: readonly ChartSeriesOption[]
  readonly [key: string]: ChartValue
}

export type ChartDataConfig = {
  readonly dataset?: ChartValue
  readonly xAxisData?: readonly ChartValue[]
  readonly series?: readonly ChartSeriesOption[]
}
