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
    readonly compact?: boolean
    readonly tableRows?: readonly TableRowConfig[]
    readonly tableColumns?: readonly TableColumnConfig[]
    readonly tableData?: TableData
    readonly chartOptions?: ChartOptionConfig
    readonly chartData?: ChartDataConfig
  }>(),
  {
    title: "入库计划推移表",
    subtitle: "按周汇总部门入库计划与实绩（mock）",
    compact: false,
    tableRows: () => departmentInboundPlanTrendRows,
    tableColumns: () => departmentInboundPlanTrendColumns,
    tableData: () => departmentInboundPlanTrendTableData,
    chartOptions: () => departmentInboundPlanTrendChartOptions,
    chartData: () => departmentInboundPlanTrendChartData,
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
    tag="mock"
    :title="title"
    :subtitle="subtitle"
    :compact="compact"
    :table-rows="tableRows"
    :table-columns="tableColumns"
    :table-data="currentTableData"
    :chart-options="currentChartOptions"
    :chart-data="currentChartData"
    @refresh="handleRefresh"
  />
</template>
