<script setup lang="ts">
import { computed } from 'vue'
import AttendanceTrendCard from '../../../../components/attendance-trend-card/AttendanceTrendCard.vue'
import DepartmentInboundPlanTrendCard from '../../../../components/department-inbound-plan-trend-card/DepartmentInboundPlanTrendCard.vue'
import LoadingIcon from '../../../../components/LoadingIcon.vue'
import ProcessProductionPlanTrendCard from '../../../../components/process-production-plan-trend-card/ProcessProductionPlanTrendCard.vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardData } from '../../data/factoryDashboardTypes'
import PersonnelAttendanceCard from '../PersonnelAttendanceCard/PersonnelAttendanceCard.vue'
import PersonnelDetailCard from '../PersonnelDetailCard/PersonnelDetailCard.vue'
import ProductionActivityCard from '../ProductionActivityCard/ProductionActivityCard.vue'
import ProductionSummaryCard from '../ProductionSummaryCard/ProductionSummaryCard.vue'

const props = defineProps<{
  readonly data: FactoryDashboardData
  readonly selectedDepartment: CssMapDepartmentValue
  readonly selectedProcess: CssMapProcessValue | null
}>()

const emit = defineEmits<{
  refresh: [cardId: string]
}>()

/** 1 课不显示入库计划推移组件（部门维度或工序维度选中 1 课的工序时统一隐藏） */
const hideInboundPlan = computed<boolean>(() => {
  if (props.data.kind === 'department') {
    return props.selectedDepartment === 'department1'
  }
  // 工序维度：前处理1/前处理2（1 课的工序）也不显示入库计划推移
  return props.selectedProcess === 'pretreatment1' || props.selectedProcess === 'pretreatment2'
})
</script>

<template>
  <view :class="['factory-dashboard-panel', `factory-dashboard-panel--${data.kind}`]">
    <view class="factory-dashboard-panel__stack">
      <ProductionSummaryCard :data="data.summary" />
      <ProductionActivityCard :data="data.activity" />

      <PersonnelAttendanceCard
        :data="data.attendance"
        @refresh="emit('refresh', 'attendance')"
      />

      <PersonnelDetailCard
        :data="data.personnelDetail"
        @refresh="emit('refresh', 'personnelDetail')"
      />

      <AttendanceTrendCard
        v-if="data.attendanceTrend !== null"
        :title="data.attendanceTrend.title"
        :subtitle="data.attendanceTrend.subtitle"
        :compact="true"
        tag=""
        :table-rows="data.attendanceTrend.tableRows"
        :table-columns="data.attendanceTrend.tableColumns"
        :table-data="data.attendanceTrend.tableData"
        :chart-options="data.attendanceTrend.chartOptions"
        :chart-data="data.attendanceTrend.chartData"
        :modal-table-rows="data.attendanceTrend.modalTableRows"
        :modal-table-columns="data.attendanceTrend.modalTableColumns"
        :modal-table-data="data.attendanceTrend.modalTableData"
        :modal-chart-options="data.attendanceTrend.modalChartOptions"
        :modal-chart-data="data.attendanceTrend.modalChartData"
        @refresh="emit('refresh', 'attendanceTrend')"
      />
      <view v-else class="factory-dashboard-panel__loading-card">
        <LoadingIcon />
      </view>

      <template v-if="data.kind === 'department'">
        <template v-if="!hideInboundPlan">
          <DepartmentInboundPlanTrendCard
            v-if="data.inboundPlanTrend !== null"
            :title="data.inboundPlanTrend.title"
            :subtitle="data.inboundPlanTrend.subtitle"
            :compact="true"
            tag=""
            :table-rows="data.inboundPlanTrend.tableRows"
            :table-columns="data.inboundPlanTrend.tableColumns"
            :table-data="data.inboundPlanTrend.tableData"
            :chart-options="data.inboundPlanTrend.chartOptions"
            :chart-data="data.inboundPlanTrend.chartData"
            :modal-table-rows="data.inboundPlanTrend.modalTableRows"
            :modal-table-columns="data.inboundPlanTrend.modalTableColumns"
            :modal-table-data="data.inboundPlanTrend.modalTableData"
            :modal-chart-options="data.inboundPlanTrend.modalChartOptions"
            :modal-chart-data="data.inboundPlanTrend.modalChartData"
            @refresh="emit('refresh', 'inboundPlanTrend')"
          />
          <view v-else class="factory-dashboard-panel__loading-card">
            <LoadingIcon />
          </view>
        </template>
      </template>

      <template v-else>
        <template v-if="!hideInboundPlan">
          <DepartmentInboundPlanTrendCard
            v-if="data.inboundPlanTrend !== null"
            :title="data.inboundPlanTrend.title"
            :subtitle="data.inboundPlanTrend.subtitle"
            :compact="true"
            tag=""
            :table-rows="data.inboundPlanTrend.tableRows"
            :table-columns="data.inboundPlanTrend.tableColumns"
            :table-data="data.inboundPlanTrend.tableData"
            :chart-options="data.inboundPlanTrend.chartOptions"
            :chart-data="data.inboundPlanTrend.chartData"
            :modal-table-rows="data.inboundPlanTrend.modalTableRows"
            :modal-table-columns="data.inboundPlanTrend.modalTableColumns"
            :modal-table-data="data.inboundPlanTrend.modalTableData"
            :modal-chart-options="data.inboundPlanTrend.modalChartOptions"
            :modal-chart-data="data.inboundPlanTrend.modalChartData"
            @refresh="emit('refresh', 'inboundPlanTrend')"
          />
          <view v-else class="factory-dashboard-panel__loading-card">
            <LoadingIcon />
          </view>
        </template>

        <ProcessProductionPlanTrendCard
          v-if="data.productionPlanTrend !== null"
          :title="data.productionPlanTrend.title"
          :subtitle="data.productionPlanTrend.subtitle"
          :compact="true"
          tag=""
          :table-rows="data.productionPlanTrend.tableRows"
          :table-columns="data.productionPlanTrend.tableColumns"
          :table-data="data.productionPlanTrend.tableData"
          :chart-options="data.productionPlanTrend.chartOptions"
          :chart-data="data.productionPlanTrend.chartData"
          :modal-table-rows="data.productionPlanTrend.modalTableRows"
          :modal-table-columns="data.productionPlanTrend.modalTableColumns"
          :modal-table-data="data.productionPlanTrend.modalTableData"
          :modal-chart-options="data.productionPlanTrend.modalChartOptions"
          :modal-chart-data="data.productionPlanTrend.modalChartData"
          @refresh="emit('refresh', 'productionPlanTrend')"
        />
        <view v-else class="factory-dashboard-panel__loading-card">
          <LoadingIcon />
        </view>
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

.factory-dashboard-panel__stack {
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

.factory-dashboard-panel--process :deep(.personnel-attendance-card__title),
.factory-dashboard-panel--process :deep(.personnel-detail-card__title),
.factory-dashboard-panel--process :deep(.table-chart-card__title) {
  font-size: 26px;
}

</style>
