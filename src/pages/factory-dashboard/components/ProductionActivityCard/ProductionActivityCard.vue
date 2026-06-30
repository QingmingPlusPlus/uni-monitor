<template>
  <view class="production-activity-card">
    <view class="production-activity-card__head">
      <text class="production-activity-card__title">{{ data.title }}</text>
    </view>

    <view class="production-activity-card__table">
      <text class="production-activity-card__cell production-activity-card__cell--head">部门</text>
      <text class="production-activity-card__cell production-activity-card__cell--head">工序</text>
      <text class="production-activity-card__cell production-activity-card__cell--head">总台数</text>
      <text class="production-activity-card__cell production-activity-card__cell--head">稼动台数</text>
      <text class="production-activity-card__cell production-activity-card__cell--head">异常台数</text>
      <text class="production-activity-card__cell production-activity-card__cell--head">计划停止台数</text>

      <template
        v-for="row in data.rows"
        :key="row.id"
      >
        <text class="production-activity-card__cell production-activity-card__cell--label">{{ row.departmentLabel }}</text>
        <text class="production-activity-card__cell production-activity-card__cell--label">{{ row.processLabel }}</text>
        <text class="production-activity-card__cell production-activity-card__cell--number">{{ row.totalCount }}</text>
        <text class="production-activity-card__cell production-activity-card__cell--number production-activity-card__cell--running">{{ row.runningCount }}</text>
        <text class="production-activity-card__cell production-activity-card__cell--number production-activity-card__cell--abnormal">{{ row.abnormalCount }}</text>
        <text class="production-activity-card__cell production-activity-card__cell--number">{{ row.plannedStopCount }}</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProductionActivityData } from '../../data/factoryDashboardTypes'

defineProps<{
  readonly data: ProductionActivityData
}>()
</script>

<style scoped>
.production-activity-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--um-color-border);
  border-radius: 18rpx;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.production-activity-card__title {
  color: var(--um-color-text-primary);
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.25;
}

.production-activity-card__table {
  display: grid;
  min-width: 0;
  grid-template-columns: 1.05fr 0.95fr repeat(4, minmax(74rpx, 0.72fr));
  overflow: hidden;
  border: 1px solid var(--um-color-rail);
  border-radius: 10rpx;
  font-variant-numeric: tabular-nums;
}

.production-activity-card__cell {
  display: flex;
  min-width: 0;
  min-height: 58rpx;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 8rpx;
  border-right: 1px solid var(--um-color-rail);
  border-bottom: 1px solid var(--um-color-rail);
  color: var(--um-color-text-primary);
  font-size: 24rpx;
  font-weight: 650;
  line-height: 1.22;
  overflow-wrap: anywhere;
  text-align: center;
}

.production-activity-card__cell:nth-child(6n) {
  border-right: 0;
}

.production-activity-card__cell:nth-last-child(-n + 6) {
  border-bottom: 0;
}

.production-activity-card__cell--head {
  background: var(--um-color-surface-subtle);
  font-size: 23rpx;
  font-weight: 800;
}

.production-activity-card__cell--label {
  font-weight: 800;
}

.production-activity-card__cell--number {
  justify-content: flex-end;
  font-size: 28rpx;
  font-weight: 800;
}

.production-activity-card__cell--running {
  color: var(--um-color-success);
}

.production-activity-card__cell--abnormal {
  color: var(--um-color-danger);
}

@media (min-width: 768px) {
  .production-activity-card {
    border-radius: 16px;
  }

  .production-activity-card__title {
    font-size: 30px;
  }

  .production-activity-card__table {
    grid-template-columns: 1.02fr 0.9fr repeat(4, minmax(92px, 0.72fr));
    border-radius: 8px;
  }

  .production-activity-card__cell {
    min-height: 42px;
    padding: 0 8px;
    font-size: 16px;
  }

  .production-activity-card__cell--head {
    font-size: 17px;
  }

  .production-activity-card__cell--number {
    font-size: 20px;
  }
}
</style>
