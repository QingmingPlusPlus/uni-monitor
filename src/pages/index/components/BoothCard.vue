<template>
  <view :class="['booth-card', `booth-card--${item.tone}`, `booth-card--${item.size}`]">
    <view class="booth-card__head">
      <text class="booth-card__code">{{ item.code }}</text>
      <text class="booth-card__status">{{ item.status }}</text>
    </view>
    <view class="booth-card__body">
      <text class="booth-card__title">{{ item.title }}</text>
      <text class="booth-card__description">{{ item.description }}</text>
    </view>
    <text class="booth-card__area">{{ item.area }}</text>
  </view>
</template>

<script setup lang="ts">
import type { BoothCardItem } from "./boothData"

defineProps<{
  readonly item: BoothCardItem
}>()
</script>

<style scoped>
.booth-card {
  display: flex;
  break-inside: avoid;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 210rpx;
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--um-color-border);
  border-left: 6rpx solid var(--um-color-accent);
  border-radius: 16rpx;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.booth-card--compact {
  min-height: 176rpx;
}

.booth-card--tall {
  min-height: 278rpx;
}

.booth-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.booth-card__code,
.booth-card__status,
.booth-card__area,
.booth-card__description {
  color: var(--um-color-text-secondary);
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.4;
}

.booth-card__code {
  color: var(--um-color-accent);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.booth-card__status {
  white-space: nowrap;
}

.booth-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.booth-card__title {
  color: var(--um-color-text-primary);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.35;
}

.booth-card--featured {
  border-left-color: var(--um-color-success);
}

.booth-card--featured .booth-card__status {
  color: var(--um-color-success);
}

.booth-card--service {
  border-left-color: var(--um-color-warning);
}

.booth-card--service .booth-card__status {
  color: var(--um-color-warning);
}

.booth-card--idle {
  border-left-color: var(--um-color-rail);
}

@media (min-width: 768px) {
  .booth-card {
    min-height: 148px;
    margin-bottom: var(--space-3);
    border-left-width: 4px;
    border-radius: 14px;
  }

  .booth-card--compact {
    min-height: 124px;
  }

  .booth-card--tall {
    min-height: 190px;
  }

  .booth-card__code,
  .booth-card__status,
  .booth-card__area,
  .booth-card__description {
    font-size: 13px;
  }

  .booth-card__title {
    font-size: 18px;
  }
}
</style>
