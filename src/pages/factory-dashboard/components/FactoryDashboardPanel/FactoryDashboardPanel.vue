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
  refresh: [cardId: string]
}>()
</script>

<template>
  <view :class="['factory-dashboard-panel', `factory-dashboard-panel--${data.kind}`]">
    <FactoryKpiGrid v-if="data.kind === 'process'" :items="data.kpis" />

    <view class="factory-dashboard-panel__waterfall">
      <template v-if="data.kind === 'department'">
        <PersonnelAttendanceCard
          :data="data.attendance"
          @refresh="emit('refresh', 'attendance')"
        />

        <AttendanceTrendCard
          v-if="data.attendanceTrend !== null"
          :title="data.attendanceTrend.title"
          :subtitle="data.attendanceTrend.subtitle"
          :compact="true"
          :table-rows="data.attendanceTrend.tableRows"
          :table-columns="data.attendanceTrend.tableColumns"
          :table-data="data.attendanceTrend.tableData"
          :chart-options="data.attendanceTrend.chartOptions"
          :chart-data="data.attendanceTrend.chartData"
          @refresh="emit('refresh', 'attendanceTrend')"
        />
        <view v-else class="factory-dashboard-panel__loading-card">
          <LoadingIcon />
        </view>

        <PersonnelDetailCard
          :data="data.personnelDetail"
          @refresh="emit('refresh', 'personnelDetail')"
        />

        <DepartmentInboundPlanTrendCard
          v-if="data.inboundPlanTrend !== null"
          :title="data.inboundPlanTrend.title"
          :subtitle="data.inboundPlanTrend.subtitle"
          :compact="true"
          :table-rows="data.inboundPlanTrend.tableRows"
          :table-columns="data.inboundPlanTrend.tableColumns"
          :table-data="data.inboundPlanTrend.tableData"
          :chart-options="data.inboundPlanTrend.chartOptions"
          :chart-data="data.inboundPlanTrend.chartData"
          @refresh="emit('refresh', 'inboundPlanTrend')"
        />
        <view v-else class="factory-dashboard-panel__loading-card">
          <LoadingIcon />
        </view>
      </template>

      <template v-else>
        <PersonnelAttendanceCard
          class="factory-dashboard-panel__wide-card"
          :data="data.attendance"
          @refresh="emit('refresh', 'attendance')"
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
          @refresh="emit('refresh', card.id)"
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
    grid-template-rows: repeat(2, auto);
    grid-auto-flow: column;
    align-items: start;
  }

  .factory-dashboard-panel__wide-card {
    grid-column: 1 / -1;
  }

  /* 部门维度改用 CSS 多列瀑布流：每一列内的组件以自然高度首尾相接，
     没有网格行对齐造成的多余空隙；列与列之间通过 column-gap 分隔，
     因卡片高度不一而错落有致。 */
  .factory-dashboard-panel--department .factory-dashboard-panel__waterfall {
    display: block;
    grid-template-columns: none;
    grid-template-rows: none;
    grid-auto-flow: unset;
    align-items: unset;
    column-count: 2;
    column-gap: var(--space-3);
  }

  .factory-dashboard-panel--department .factory-dashboard-panel__waterfall > * {
    break-inside: avoid;
    page-break-inside: avoid;
    margin: 0 0 var(--space-3) 0;
    width: 100%;
  }

  .factory-dashboard-panel--department .factory-dashboard-panel__waterfall > *:last-child {
    margin-bottom: 0;
  }
}
</style>
