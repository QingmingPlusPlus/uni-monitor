<script setup lang="ts">
import TableChartCard from "../table-chart-card/TableChartCard.vue"
import {
  departmentDefectAmountChartData,
  departmentDefectAmountChartOptions,
  departmentDefectAmountColumns,
  departmentDefectAmountRows,
  departmentDefectAmountTableData,
} from "./departmentDefectAmountMock"

withDefaults(
  defineProps<{
    readonly title?: string
    readonly subtitle?: string
    readonly compact?: boolean
  }>(),
  {
    title: "不良率计画实绩（金额）",
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
    :table-rows="departmentDefectAmountRows"
    :table-columns="departmentDefectAmountColumns"
    :table-data="departmentDefectAmountTableData"
    :chart-options="departmentDefectAmountChartOptions"
    :chart-data="departmentDefectAmountChartData"
    @refresh="handleRefresh"
  />
</template>