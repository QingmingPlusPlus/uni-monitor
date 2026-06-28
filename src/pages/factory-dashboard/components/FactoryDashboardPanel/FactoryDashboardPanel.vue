<script setup lang="ts">
import TableChartCard from '../../../../components/table-chart-card/TableChartCard.vue'
import type { FactoryDashboardData } from '../../data/factoryDashboardTypes'
import FactoryKpiGrid from '../FactoryKpiGrid/FactoryKpiGrid.vue'

defineProps<{
  readonly data: FactoryDashboardData
}>()
</script>

<template>
  <view class="factory-dashboard-panel">
    <FactoryKpiGrid :items="data.kpis" />

    <view class="factory-dashboard-panel__cards">
      <TableChartCard
        v-for="card in data.cards"
        :key="card.id"
        tag="Mock 数据"
        :title="card.title"
        :subtitle="card.subtitle"
        :table-rows="card.tableRows"
        :table-columns="card.tableColumns"
        :table-data="card.tableData"
        :chart-options="card.chartOptions"
        :chart-data="card.chartData"
      />
    </view>
  </view>
</template>

<style scoped>
.factory-dashboard-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: var(--space-3);
}

.factory-dashboard-panel__cards {
  display: grid;
  min-height: 0;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}
</style>
