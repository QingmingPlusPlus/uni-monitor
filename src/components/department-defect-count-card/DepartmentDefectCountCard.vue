<script setup lang="ts">
import TableChartCard from "../table-chart-card/TableChartCard.vue"
import {
  departmentDefectCountChartData,
  departmentDefectCountChartOptions,
  departmentDefectCountColumns,
  departmentDefectCountRows,
  departmentDefectCountTableData,
} from "./departmentDefectCountMock"

withDefaults(
  defineProps<{
    readonly title?: string
    readonly subtitle?: string
    readonly compact?: boolean
  }>(),
  {
    title: "不良率计画实绩（个数）",
    subtitle: "按周汇总部门不良率计划与实绩（mock）",
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
    :table-rows="departmentDefectCountRows"
    :table-columns="departmentDefectCountColumns"
    :table-data="departmentDefectCountTableData"
    :chart-options="departmentDefectCountChartOptions"
    :chart-data="departmentDefectCountChartData"
    @refresh="handleRefresh"
  />
</template>