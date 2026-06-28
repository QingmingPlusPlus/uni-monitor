<template>
  <view class="department-waterfall">
    <TableChartCard
      class="department-waterfall__chart"
      title="部门产能达成"
      subtitle="各部门计划产能、实际产能、偏差和达成率"
      tag="Mock 数据"
      :table-rows="departmentTableChartRows"
      :table-columns="departmentTableChartColumns"
      :table-data="departmentTableChartData"
      :chart-options="departmentTableChartOptions"
      :chart-data="departmentTableChartChartData"
    />
    <BoothCard v-for="item in departmentCards" :key="item.code" :item="item" />
  </view>
</template>

<script setup lang="ts">
import TableChartCard from "../../../components/TableChartCard.vue"
import BoothCard from "./BoothCard.vue"
import { boothCards } from "./boothData"
import {
  departmentTableChartChartData,
  departmentTableChartColumns,
  departmentTableChartData,
  departmentTableChartOptions,
  departmentTableChartRows,
} from "./departmentTableChartMock"

const departmentCards = boothCards
</script>

<style scoped>
.department-waterfall {
  column-count: 1;
  column-gap: var(--space-3);
}

.department-waterfall__chart {
  break-inside: avoid;
  margin-bottom: var(--space-3);
}

@media (min-width: 768px) {
  .department-waterfall {
    column-count: 2;
  }

  .department-waterfall__chart {
    column-span: all;
  }
}

@media (min-width: 1600px) {
  .department-waterfall {
    column-count: 3;
  }
}
</style>
