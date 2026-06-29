<script setup lang="ts">
import TableChartCard from "../table-chart-card/TableChartCard.vue"
import {
  departmentMhChartData,
  departmentMhChartOptions,
  departmentMhColumns,
  departmentMhRows,
  departmentMhTableData,
} from "./departmentMhMock"

withDefaults(
  defineProps<{
    readonly title?: string
    readonly subtitle?: string
    readonly compact?: boolean
  }>(),
  {
    title: "MH实绩",
    subtitle: "按周汇总 MH 计划/实绩与出勤率（mock）",
    compact: false,
  },
)

const emit = defineEmits<{
  refresh: []
}>()

function handleRefresh(): void {
  emit("refresh")
}
</script>

<template>
  <TableChartCard
    tag="mock"
    use-mock-expand
    :title="title"
    :subtitle="subtitle"
    :compact="compact"
    :table-rows="departmentMhRows"
    :table-columns="departmentMhColumns"
    :table-data="departmentMhTableData"
    :chart-options="departmentMhChartOptions"
    :chart-data="departmentMhChartData"
    @refresh="handleRefresh"
  />
</template>