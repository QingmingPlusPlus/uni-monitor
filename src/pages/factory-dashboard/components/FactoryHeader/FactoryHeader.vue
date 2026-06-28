<script setup lang="ts">
import type { FactoryKpiItem } from '../../data/factoryDashboardTypes'

defineProps<{
  readonly eyebrow: string
  readonly title: string
  readonly subtitle: string
  readonly stats: readonly FactoryKpiItem[]
}>()
</script>

<template>
  <view class="factory-header">
    <view class="factory-header__copy">
      <text class="factory-header__eyebrow">{{ eyebrow }}</text>
      <text class="factory-header__title">{{ title }}</text>
      <text class="factory-header__subtitle">{{ subtitle }}</text>
    </view>

    <view class="factory-header__stats">
      <view
        v-for="item in stats.slice(0, 3)"
        :key="item.label"
        class="factory-header__stat"
      >
        <text class="factory-header__stat-label">{{ item.label }}</text>
        <text class="factory-header__stat-value">{{ item.value }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.factory-header {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 14rpx;
  background: var(--um-color-surface);
}

.factory-header__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
}

.factory-header__eyebrow {
  color: var(--um-color-operation);
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1.3;
}

.factory-header__title {
  color: var(--um-color-text-primary);
  font-size: 46rpx;
  font-weight: 800;
  line-height: 1.2;
}

.factory-header__subtitle {
  max-width: 920rpx;
  color: var(--um-color-text-secondary);
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1.45;
}

.factory-header__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.factory-header__stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4rpx;
  padding: var(--space-2);
  border: 1px solid var(--um-color-border);
  border-radius: 10rpx;
  background: var(--um-color-surface-subtle);
}

.factory-header__stat-label {
  color: var(--um-color-text-secondary);
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1.3;
}

.factory-header__stat-value {
  overflow: hidden;
  color: var(--um-color-text-primary);
  font-size: 25rpx;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .factory-header {
    flex-direction: row;
    align-items: stretch;
    justify-content: space-between;
    border-radius: 10px;
  }

  .factory-header__copy {
    justify-content: center;
  }

  .factory-header__eyebrow {
    font-size: 14px;
  }

  .factory-header__title {
    font-size: 34px;
  }

  .factory-header__subtitle {
    max-width: 820px;
    font-size: 17px;
  }

  .factory-header__stats {
    width: min(40vw, 680px);
  }

  .factory-header__stat {
    padding: 12px 14px;
    border-radius: 8px;
  }

  .factory-header__stat-label {
    font-size: 13px;
  }

  .factory-header__stat-value {
    font-size: 17px;
  }
}
</style>
