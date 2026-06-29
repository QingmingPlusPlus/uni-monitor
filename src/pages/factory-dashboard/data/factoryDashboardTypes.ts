import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from '../../../components/table-chart-card/TableChartCard.types'
import type { PersonnelDetailData } from './personnelDetailMock'

export type KpiTone = 'operation' | 'success' | 'warning' | 'danger' | 'neutral'

export interface FactoryKpiItem {
  readonly label: string
  readonly value: string
  readonly note: string
  readonly tone: KpiTone
}

export type FactoryAlarmLevel = 'danger' | 'warning' | 'neutral'

export interface FactoryAlarmItem {
  readonly id: string
  readonly level: FactoryAlarmLevel
  readonly source: string
  readonly message: string
  readonly durationMinutes: number
  readonly estimatedImpactMinutes: number
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

export type FactoryDashboardKind = 'department' | 'process'

/** 部门维度瀑布流卡片标识，用于按卡片粒度刷新。 */
export type DepartmentCardId = 'attendance' | 'attendanceTrend' | 'inboundPlanTrend' | 'personnelDetail'

export type PersonnelAttendanceShift = 'day' | 'night' | 'regular' | 'total'

export interface PersonnelAttendanceRow {
  readonly id: string
  readonly shift: PersonnelAttendanceShift
  readonly shiftLabel: string
  readonly indirectDirectRoster: number
  readonly indirectLeaderRoster: number
  readonly indirectLeaderAttendance: number | null
  readonly directTeamLeader: number
  readonly directRegular: number
  readonly directDispatched: number
  readonly directTemporary: number
  readonly directStandby: number
  readonly directRosterTotal: number
  readonly actualAttendance: number
  readonly attendanceRate: number | null
}

export interface PersonnelAttendanceProcessGroup {
  readonly id: string
  readonly label: string
  readonly rows: readonly PersonnelAttendanceRow[]
}

export interface PersonnelAttendanceData {
  readonly title: string
  readonly subtitle: string
  readonly refreshedAt: string
  readonly groups: readonly PersonnelAttendanceProcessGroup[]
}

interface FactoryDashboardBaseData {
  readonly eyebrow: string
  readonly title: string
  readonly subtitle: string
  readonly kpis: readonly FactoryKpiItem[]
  readonly cards: readonly FactoryDashboardCard[]
}

export interface DepartmentDashboardData extends FactoryDashboardBaseData {
  readonly kind: 'department'
  readonly attendance: PersonnelAttendanceData
  readonly attendanceTrend: FactoryDashboardCard | null
  readonly inboundPlanTrend: FactoryDashboardCard | null
  readonly personnelDetail: PersonnelDetailData
}

export interface ProcessDashboardData extends FactoryDashboardBaseData {
  readonly kind: 'process'
  readonly attendance: PersonnelAttendanceData
  readonly personnelDetail: PersonnelDetailData
}

export type FactoryDashboardData = DepartmentDashboardData | ProcessDashboardData

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
