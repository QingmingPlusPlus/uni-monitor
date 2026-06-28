import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from '../../../components/table-chart-card/TableChartCard.types'

export type KpiTone = 'operation' | 'success' | 'warning' | 'danger' | 'neutral'

export interface FactoryKpiItem {
  readonly label: string
  readonly value: string
  readonly note: string
  readonly tone: KpiTone
}

export interface FactoryDashboardCard {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly tableRows: readonly TableRowConfig[]
  readonly tableColumns: readonly TableColumnConfig[]
  readonly tableData: TableData
  readonly chartOptions: ChartOptionConfig
  readonly chartData: ChartDataConfig
}

export interface FactoryDashboardData {
  readonly eyebrow: string
  readonly title: string
  readonly subtitle: string
  readonly kpis: readonly FactoryKpiItem[]
  readonly cards: readonly FactoryDashboardCard[]
}

export interface EquipmentDetailRow {
  readonly label: string
  readonly value: string
  readonly tone?: KpiTone
}

export interface EquipmentTimelineItem {
  readonly time: string
  readonly title: string
  readonly detail: string
}

export interface EquipmentDetailData {
  readonly eyebrow: string
  readonly title: string
  readonly subtitle: string
  readonly kpis: readonly FactoryKpiItem[]
  readonly currentPlan: readonly EquipmentDetailRow[]
  readonly downtimePlan: readonly EquipmentDetailRow[]
  readonly lossReasons: readonly EquipmentDetailRow[]
  readonly defectReasons: readonly EquipmentDetailRow[]
  readonly timeline: readonly EquipmentTimelineItem[]
  readonly cycleRows: readonly EquipmentDetailRow[]
}
