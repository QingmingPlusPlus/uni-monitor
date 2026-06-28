<script setup lang="ts">
import { computed } from 'vue'
import TableChartCard from '../../../../components/table-chart-card/TableChartCard.vue'
import type { FactoryDashboardData } from '../../data/factoryDashboardTypes'
import FactoryKpiGrid from '../FactoryKpiGrid/FactoryKpiGrid.vue'
import PersonnelAttendanceCard from '../PersonnelAttendanceCard/PersonnelAttendanceCard.vue'

const props = defineProps<{
  readonly data: FactoryDashboardData
}>()

const emit = defineEmits<{
  refresh: []
}>()

const departmentAttendance = computed(() =>
  props.data.kind === 'department' ? props.data.attendance : null,
)
</script>

<template>
  <view :class="['factory-dashboard-panel', `factory-dashboard-panel--${data.kind}`]">
    <template v-if="departmentAttendance !== null">
      <PersonnelAttendanceCard
        :data="departmentAttendance"
        @refresh="emit('refresh')"
      />

      <view class="factory-dashboard-panel__waterfall">
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
          @refresh="emit('refresh')"
        />
      </view>
    </template>

    <template v-else>
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
          @refresh="emit('refresh')"
        />
      </view>
    </template>
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

.factory-dashboard-panel__waterfall {
  display: grid;
  min-height: 0;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

@media (min-width: 1440px) {
  .factory-dashboard-panel__waterfall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
