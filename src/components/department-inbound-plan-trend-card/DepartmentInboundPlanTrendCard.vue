<script setup lang="ts">
import { computed } from "vue"
import TableChartCard from "../table-chart-card/TableChartCard.vue"
import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "../table-chart-card/TableChartCard.types"
import {
  departmentInboundPlanTrendChartData,
  departmentInboundPlanTrendChartOptions,
  departmentInboundPlanTrendColumns,
  departmentInboundPlanTrendRows,
  departmentInboundPlanTrendTableData,
} from "./departmentInboundPlanTrendMock"

const props = withDefaults(
  defineProps<{
    readonly title?: string
    readonly subtitle?: string
    readonly tag?: string
    readonly compact?: boolean
    readonly useMockExpand?: boolean
    readonly tableRows?: readonly TableRowConfig[]
    readonly tableColumns?: readonly TableColumnConfig[]
    readonly tableData?: TableData
    readonly chartOptions?: ChartOptionConfig
    readonly chartData?: ChartDataConfig
    readonly modalTableRows?: readonly TableRowConfig[]
    readonly modalTableColumns?: readonly TableColumnConfig[]
    readonly modalTableData?: TableData
    readonly modalChartOptions?: ChartOptionConfig
    readonly modalChartData?: ChartDataConfig
  }>(),
  {
    title: "入库计划推移表",
    subtitle: "按周汇总部门入库计划与实绩（mock）",
    tag: "mock",
    compact: false,
    useMockExpand: false,
    tableRows: () => departmentInboundPlanTrendRows,
    tableColumns: () => departmentInboundPlanTrendColumns,
    tableData: () => departmentInboundPlanTrendTableData,
    chartOptions: () => departmentInboundPlanTrendChartOptions,
    chartData: () => departmentInboundPlanTrendChartData,
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

const currentTableData = computed(() => props.tableData)
const currentChartOptions = computed(() => props.chartOptions)
const currentChartData = computed(() => props.chartData)

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
    :table-rows="tableRows"
    :table-columns="tableColumns"
    :table-data="currentTableData"
    :chart-options="currentChartOptions"
    :chart-data="currentChartData"
    :modal-table-rows="modalTableRows"
    :modal-table-columns="modalTableColumns"
    :modal-table-data="modalTableData"
    :modal-chart-options="modalChartOptions"
    :modal-chart-data="modalChartData"
    @refresh="handleRefresh"
  />
</template>
