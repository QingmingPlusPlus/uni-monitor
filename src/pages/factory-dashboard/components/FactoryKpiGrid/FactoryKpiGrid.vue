<script setup lang="ts">
import type { FactoryKpiItem } from '../../data/factoryDashboardTypes'

defineProps<{
  readonly items: readonly FactoryKpiItem[]
}>()
</script>

<template>
  <view class="factory-kpi-grid">
    <view
      v-for="item in items"
      :key="`${item.label}-${item.value}`"
      class="factory-kpi-grid__item"
      :class="`factory-kpi-grid__item--${item.tone}`"
    >
      <text class="factory-kpi-grid__label">{{ item.label }}</text>
      <text class="factory-kpi-grid__value">{{ item.value }}</text>
      <text class="factory-kpi-grid__note">{{ item.note }}</text>
    </view>
  </view>
</template>

<style scoped>
.factory-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.factory-kpi-grid__item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5rpx;
  padding: var(--space-2);
  border: 1px solid var(--um-color-border);
  border-left: 5rpx solid var(--um-color-border);
  border-radius: 10rpx;
  background: var(--um-color-surface);
}

.factory-kpi-grid__item--operation {
  border-left-color: var(--um-color-operation);
}

.factory-kpi-grid__item--success {
  border-left-color: var(--um-color-success);
}

.factory-kpi-grid__item--warning {
  border-left-color: var(--um-color-warning);
}

.factory-kpi-grid__item--danger {
  border-left-color: var(--um-color-danger);
}

.factory-kpi-grid__label,
.factory-kpi-grid__note {
  overflow: hidden;
  color: var(--um-color-text-secondary);
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factory-kpi-grid__value {
  overflow: hidden;
  color: var(--um-color-text-primary);
  font-size: 34rpx;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .factory-kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .factory-kpi-grid__item {
    gap: 4px;
    padding: 12px 14px;
    border-left-width: 4px;
    border-radius: 8px;
  }

  .factory-kpi-grid__label,
  .factory-kpi-grid__note {
    font-size: 14px;
  }

  .factory-kpi-grid__value {
    font-size: 24px;
  }
}

@media (min-width: 1920px) {
  .factory-kpi-grid__label,
  .factory-kpi-grid__note {
    font-size: 15px;
  }

  .factory-kpi-grid__value {
    font-size: 28px;
  }
}
</style>
