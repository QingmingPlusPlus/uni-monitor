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
  attendanceTrendChartData,
  attendanceTrendChartOptions,
  attendanceTrendColumns,
  attendanceTrendRows,
  attendanceTrendTableData,
} from "./attendanceTrendMock"

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
    title: "出勤率推移表",
    subtitle: "月、周、日维度人员出勤情况（mock）",
    tableRows: () => attendanceTrendRows,
    tableColumns: () => attendanceTrendColumns,
    tableData: () => attendanceTrendTableData,
    chartOptions: () => attendanceTrendChartOptions,
    chartData: () => attendanceTrendChartData,
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
    :table-rows="tableRows"
    :table-columns="tableColumns"
    :table-data="currentTableData"
    :chart-options="currentChartOptions"
    :chart-data="currentChartData"
    @refresh="handleRefresh"
  />
</template>
