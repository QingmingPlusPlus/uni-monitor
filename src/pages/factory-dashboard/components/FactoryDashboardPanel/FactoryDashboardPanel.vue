<script setup lang="ts">
import AttendanceTrendCard from '../../../../components/attendance-trend-card/AttendanceTrendCard.vue'
import DepartmentInboundPlanTrendCard from '../../../../components/department-inbound-plan-trend-card/DepartmentInboundPlanTrendCard.vue'
import LoadingIcon from '../../../../components/LoadingIcon.vue'
import TableChartCard from '../../../../components/table-chart-card/TableChartCard.vue'
import type { FactoryDashboardData } from '../../data/factoryDashboardTypes'
import FactoryKpiGrid from '../FactoryKpiGrid/FactoryKpiGrid.vue'
import PersonnelAttendanceCard from '../PersonnelAttendanceCard/PersonnelAttendanceCard.vue'
import PersonnelDetailCard from '../PersonnelDetailCard/PersonnelDetailCard.vue'

defineProps<{
  readonly data: FactoryDashboardData
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <view :class="['factory-dashboard-panel', `factory-dashboard-panel--${data.kind}`]">
    <FactoryKpiGrid v-if="data.kind === 'process'" :items="data.kpis" />

    <view class="factory-dashboard-panel__waterfall">
      <template v-if="data.kind === 'department'">
        <PersonnelAttendanceCard
          :data="data.attendance"
          @refresh="emit('refresh')"
        />

        <AttendanceTrendCard
          v-if="data.attendanceTrend !== null"
          :title="data.attendanceTrend.title"
          :subtitle="data.attendanceTrend.subtitle"
          :table-rows="data.attendanceTrend.tableRows"
          :table-columns="data.attendanceTrend.tableColumns"
          :table-data="data.attendanceTrend.tableData"
          :chart-options="data.attendanceTrend.chartOptions"
          :chart-data="data.attendanceTrend.chartData"
          @refresh="emit('refresh')"
        />
        <view v-else class="factory-dashboard-panel__loading-card">
          <LoadingIcon />
        </view>

        <PersonnelDetailCard
          :data="data.personnelDetail"
          @refresh="emit('refresh')"
        />

        <DepartmentInboundPlanTrendCard
          v-if="data.inboundPlanTrend !== null"
          :title="data.inboundPlanTrend.title"
          :subtitle="data.inboundPlanTrend.subtitle"
          :table-rows="data.inboundPlanTrend.tableRows"
          :table-columns="data.inboundPlanTrend.tableColumns"
          :table-data="data.inboundPlanTrend.tableData"
          :chart-options="data.inboundPlanTrend.chartOptions"
          :chart-data="data.inboundPlanTrend.chartData"
          @refresh="emit('refresh')"
        />
        <view v-else class="factory-dashboard-panel__loading-card">
          <LoadingIcon />
        </view>
      </template>

      <template v-else>
        <PersonnelAttendanceCard
          class="factory-dashboard-panel__wide-card"
          :data="data.attendance"
          @refresh="emit('refresh')"
        />

        <TableChartCard
          v-for="card in data.cards"
          :key="card.id"
          tag="mock"
          :title="card.title"
          :subtitle="card.subtitle"
          :table-rows="card.tableRows"
          :table-columns="card.tableColumns"
          :table-data="card.tableData"
          :chart-options="card.chartOptions"
          :chart-data="card.chartData"
          @refresh="emit('refresh')"
        />
      </template>
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

.factory-dashboard-panel__waterfall {
  display: grid;
  min-height: 0;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.factory-dashboard-panel__loading-card {
  display: flex;
  min-width: 0;
  min-height: 480px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--um-color-border);
  border-radius: 16px;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.factory-dashboard-panel--department :deep(.personnel-attendance-card__title),
.factory-dashboard-panel--department :deep(.personnel-detail-card__title),
.factory-dashboard-panel--department :deep(.table-chart-card__title) {
  font-size: 26px;
}

@media (min-width: 1440px) {
  .factory-dashboard-panel__waterfall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .factory-dashboard-panel__wide-card {
    grid-column: 1 / -1;
  }
}
</style>
