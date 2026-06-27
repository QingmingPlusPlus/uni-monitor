<template>
  <view class="equipment-placeholder-card">
    <view class="equipment-placeholder-card__icon">
      <text class="equipment-placeholder-card__icon-text">{{ item.code }}</text>
    </view>
    <view class="equipment-placeholder-card__body">
      <text class="equipment-placeholder-card__title">{{ item.title }}</text>
      <text class="equipment-placeholder-card__description">
        {{ item.description }}
      </text>
    </view>
    <view class="equipment-placeholder-card__footer">
      <text class="equipment-placeholder-card__process">{{ item.process }}</text>
      <text class="equipment-placeholder-card__status">{{ item.status }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { EquipmentCardItem } from "../equipmentData"

defineProps<{
  readonly item: EquipmentCardItem
}>()
</script>

<style scoped>
.equipment-placeholder-card {
  display: flex;
  break-inside: avoid;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 320rpx;
  margin-bottom: var(--space-3);
  padding: var(--space-4);
  border: 1px dashed var(--um-color-border);
  border-radius: 16rpx;
  background:
    linear-gradient(
      135deg,
      var(--um-color-surface) 0%,
      var(--um-color-surface-subtle) 100%
    );
  box-sizing: border-box;
}

.equipment-placeholder-card__icon {
  display: flex;
  width: 80rpx;
  height: 80rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid var(--um-color-accent);
  border-radius: 12rpx;
  background: var(--um-color-surface);
}

.equipment-placeholder-card__icon-text {
  color: var(--um-color-accent);
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1;
}

.equipment-placeholder-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.equipment-placeholder-card__title {
  color: var(--um-color-text-primary);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.35;
}

.equipment-placeholder-card__description {
  color: var(--um-color-text-secondary);
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.45;
}

.equipment-placeholder-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.equipment-placeholder-card__process {
  color: var(--um-color-text-secondary);
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.4;
}

.equipment-placeholder-card__status {
  color: var(--um-color-accent);
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .equipment-placeholder-card {
    min-height: 220px;
    margin-bottom: var(--space-3);
    padding: 20px;
    border-radius: 14px;
  }

  .equipment-placeholder-card__icon {
    width: 48px;
    height: 48px;
    border-width: 2px;
    border-radius: 8px;
  }

  .equipment-placeholder-card__icon-text {
    font-size: 13px;
  }

  .equipment-placeholder-card__title {
    font-size: 18px;
  }

  .equipment-placeholder-card__description {
    font-size: 13px;
  }

  .equipment-placeholder-card__process,
  .equipment-placeholder-card__status {
    font-size: 13px;
  }
}
</style>
