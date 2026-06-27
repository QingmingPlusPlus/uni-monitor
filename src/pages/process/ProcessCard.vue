<template>
  <view
    :class="[
      'process-card',
      `process-card--${item.tone}`,
      `process-card--${item.size}`,
    ]"
  >
    <view class="process-card__head">
      <text class="process-card__code">{{ item.code }}</text>
      <text class="process-card__status">{{ item.status }}</text>
    </view>
    <view class="process-card__body">
      <text class="process-card__title">{{ item.title }}</text>
      <text class="process-card__description">{{ item.description }}</text>
    </view>
    <text class="process-card__department">{{ item.department }}</text>
  </view>
</template>

<script setup lang="ts">
import type { ProcessCardItem } from "./processData"

defineProps<{
  readonly item: ProcessCardItem
}>()
</script>

<style scoped>
.process-card {
  display: flex;
  break-inside: avoid;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 320rpx;
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--um-color-border);
  border-left: 6rpx solid var(--um-color-accent);
  border-radius: 16rpx;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.process-card--compact {
  min-height: 260rpx;
}

.process-card--tall {
  min-height: 420rpx;
}

.process-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.process-card__code,
.process-card__status,
.process-card__department,
.process-card__description {
  color: var(--um-color-text-secondary);
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.4;
}

.process-card__code {
  color: var(--um-color-accent);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.process-card__status {
  white-space: nowrap;
}

.process-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.process-card__title {
  color: var(--um-color-text-primary);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.35;
}

.process-card--running {
  border-left-color: var(--um-color-success);
}

.process-card--running .process-card__status {
  color: var(--um-color-success);
}

.process-card--maintenance {
  border-left-color: var(--um-color-warning);
}

.process-card--maintenance .process-card__status {
  color: var(--um-color-warning);
}

.process-card--warning {
  border-left-color: var(--um-color-warning);
}

.process-card--warning .process-card__status {
  color: var(--um-color-warning);
}

.process-card--idle {
  border-left-color: var(--um-color-rail);
}

@media (min-width: 768px) {
  .process-card {
    min-height: 220px;
    margin-bottom: var(--space-3);
    border-left-width: 4px;
    border-radius: 14px;
  }

  .process-card--compact {
    min-height: 186px;
  }

  .process-card--tall {
    min-height: 285px;
  }

  .process-card__code,
  .process-card__status,
  .process-card__department,
  .process-card__description {
    font-size: 13px;
  }

  .process-card__title {
    font-size: 18px;
  }
}
</style>
