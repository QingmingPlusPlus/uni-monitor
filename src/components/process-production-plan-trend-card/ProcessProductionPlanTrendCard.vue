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
  processProductionPlanTrendChartData,
  processProductionPlanTrendChartOptions,
  processProductionPlanTrendColumns,
  processProductionPlanTrendRows,
  processProductionPlanTrendTableData,
} from "./processProductionPlanTrendMock"

const props = withDefaults(
  defineProps<{
    readonly title?: string
    readonly subtitle?: string
    readonly tableRows?: readonly TableRowConfig[]
    readonly tableColumns?: readonly TableColumnConfig[]
    readonly tableData?: TableData
    readonly chartOptions?: ChartOptionConfig
    readonly chartData?: ChartDataConfig
  }>(),
  {
    title: "生产计划实绩推移表",
    subtitle: "工序维度生产计划与实绩推移（mock）",
    tableRows: () => processProductionPlanTrendRows,
    tableColumns: () => processProductionPlanTrendColumns,
    tableData: () => processProductionPlanTrendTableData,
    chartOptions: () => processProductionPlanTrendChartOptions,
    chartData: () => processProductionPlanTrendChartData,
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
    use-mock-expand
    :title="title"
    :subtitle="subtitle"
    :table-rows="tableRows"
    :table-columns="tableColumns"
    :table-data="currentTableData"
    :chart-options="currentChartOptions"
    :chart-data="currentChartData"
    @refresh="handleRefresh"
  />
</template>
