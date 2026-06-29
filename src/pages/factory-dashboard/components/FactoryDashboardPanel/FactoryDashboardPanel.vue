<script setup lang="ts">
import { computed } from 'vue'
import AttendanceTrendCard from '../../../../components/attendance-trend-card/AttendanceTrendCard.vue'
import DepartmentDefectAmountCard from '../../../../components/department-defect-amount-card/DepartmentDefectAmountCard.vue'
import DepartmentDefectCountCard from '../../../../components/department-defect-count-card/DepartmentDefectCountCard.vue'
import DepartmentInboundPlanTrendCard from '../../../../components/department-inbound-plan-trend-card/DepartmentInboundPlanTrendCard.vue'
import DepartmentMhCard from '../../../../components/department-mh-card/DepartmentMhCard.vue'
import LoadingIcon from '../../../../components/LoadingIcon.vue'
import ProcessProductionPlanTrendCard from '../../../../components/process-production-plan-trend-card/ProcessProductionPlanTrendCard.vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../../../components/css-map/css3dMapTypes'
import type { FactoryDashboardData } from '../../data/factoryDashboardTypes'
import PersonnelAttendanceCard from '../PersonnelAttendanceCard/PersonnelAttendanceCard.vue'
import PersonnelDetailCard from '../PersonnelDetailCard/PersonnelDetailCard.vue'

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
    <view class="factory-dashboard-panel__waterfall">
      <template v-if="data.kind === 'department'">
        <!-- 新增三个 TableChart 卡片（第一列） -->
        <DepartmentDefectAmountCard compact />
        <DepartmentDefectCountCard compact />
        <DepartmentMhCard compact />

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

        <template v-if="!hideInboundPlan">
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

        <PersonnelDetailCard
          :data="data.personnelDetail"
          @refresh="emit('refresh', 'personnelDetail')"
        />
      </template>

      <template v-else>
        <!-- 工序维度仿照部门维度：左侧瀑布流由部门维度所有组件 + 生产计划推移构成 -->
        <PersonnelAttendanceCard
          class="factory-dashboard-panel__wide-card"
          :data="data.attendance"
          @refresh="emit('refresh', 'attendance')"
        />

        <DepartmentDefectAmountCard compact />
        <DepartmentDefectCountCard compact />
        <DepartmentMhCard compact />

        <AttendanceTrendCard compact />

        <template v-if="!hideInboundPlan">
          <DepartmentInboundPlanTrendCard compact />
        </template>

        <PersonnelDetailCard :data="data.personnelDetail" />

        <ProcessProductionPlanTrendCard />
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

.factory-dashboard-panel--process :deep(.personnel-attendance-card__title),
.factory-dashboard-panel--process :deep(.personnel-detail-card__title),
.factory-dashboard-panel--process :deep(.table-chart-card__title) {
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

  /* 部门/工序 维度使用 CSS 多列瀑布流，确保第一列在前 */
  .factory-dashboard-panel--department .factory-dashboard-panel__waterfall,
  .factory-dashboard-panel--process .factory-dashboard-panel__waterfall {
    display: block;
    grid-template-columns: none;
    grid-template-rows: none;
    grid-auto-flow: unset;
    align-items: unset;
    column-count: 2;
    column-gap: var(--space-3);
  }

  .factory-dashboard-panel--department .factory-dashboard-panel__waterfall > *,
  .factory-dashboard-panel--process .factory-dashboard-panel__waterfall > * {
    break-inside: avoid;
    page-break-inside: avoid;
    margin: 0 0 var(--space-3) 0;
    width: 100%;
  }

  .factory-dashboard-panel--department .factory-dashboard-panel__waterfall > *:last-child,
  .factory-dashboard-panel--process .factory-dashboard-panel__waterfall > *:last-child {
    margin-bottom: 0;
  }
}
</style>
