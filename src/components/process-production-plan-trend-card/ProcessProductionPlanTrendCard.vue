<script setup lang="ts">
import TableChartCard from "../table-chart-card/TableChartCard.vue"
import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"
const props = withDefaults(
  defineProps<{
    readonly title: string
    readonly subtitle?: string
    readonly tag?: string
    readonly compact?: boolean
    readonly labelColumnWidth?: string
    readonly useMockExpand?: boolean
    readonly tableRows: readonly TableRowConfig[]
    readonly tableColumns: readonly TableColumnConfig[]
    readonly tableData: TableData
    readonly chartOptions: ChartOptionConfig
    readonly chartData: ChartDataConfig
    readonly modalTableRows?: readonly TableRowConfig[]
    readonly modalTableColumns?: readonly TableColumnConfig[]
    readonly modalTableData?: TableData
    readonly modalChartOptions?: ChartOptionConfig
    readonly modalChartData?: ChartDataConfig
  }>(),
  {
    subtitle: "固定模拟数据，按月、周及当前周工作日汇总",
    tag: "mock",
    compact: false,
    labelColumnWidth: "",
    useMockExpand: false,
    modalTableRows: undefined,
    modalTableColumns: undefined,
    modalTableData: undefined,
    modalChartOptions: undefined,
    modalChartData: undefined,
  },
)

const emit = defineEmits<{
  refresh: []
}>()

const handleRefresh = (): void => {
  emit("refresh")
}
</script>

<template>
  <TableChartCard
    :tag="tag"
    :use-mock-expand="useMockExpand"
    :title="title"
    :subtitle="subtitle"
    :compact="compact"
    :label-column-width="labelColumnWidth"
    :table-rows="tableRows"
    :table-columns="tableColumns"
    :table-data="tableData"
    :chart-options="chartOptions"
    :chart-data="chartData"
    :modal-table-rows="modalTableRows"
    :modal-table-columns="modalTableColumns"
    :modal-table-data="modalTableData"
    :modal-chart-options="modalChartOptions"
    :modal-chart-data="modalChartData"
    @refresh="handleRefresh"
  />
</template>
