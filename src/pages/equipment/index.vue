<template>
  <view class="equipment-page">
    <view class="equipment-page__header">
      <view class="equipment-page__header-copy">
        <text class="equipment-page__label">Equipment Dimension</text>
        <text class="equipment-page__title">设备维度</text>
        <text class="equipment-page__subtitle">
          展示各工序下的具体设备状态、运行参数与维护信息。
        </text>
      </view>
      <view class="equipment-page__actions">
        <view class="equipment-page__back" @click="handleBack">
          <text class="equipment-page__back-text">← 返回上一维度</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="equipment-page__scroll"
      scroll-y
      :show-scrollbar="true"
    >
      <EquipmentWaterfall />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import EquipmentWaterfall from "./components/EquipmentWaterfall.vue"

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.navigateTo({ url: "/pages/department/index" })
  }
}
</script>

<style scoped>
.equipment-page {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  padding: var(--space-3);
  background: var(--um-color-page);
  box-sizing: border-box;
}

.equipment-page__header {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 18rpx;
  background: var(--um-color-surface);
}

.equipment-page__header-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.equipment-page__label {
  color: var(--um-color-accent);
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.4;
}

.equipment-page__title {
  color: var(--um-color-text-primary);
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.25;
}

.equipment-page__subtitle {
  max-width: 760rpx;
  color: var(--um-color-text-secondary);
  font-size: 26rpx;
  line-height: 1.5;
}

.equipment-page__actions {
  display: flex;
  gap: var(--space-2);
}

.equipment-page__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 12rpx;
  background: var(--um-color-surface-subtle);
  cursor: pointer;
  transition: background 0.15s ease;
}

.equipment-page__back:hover {
  background: var(--um-color-border);
}

.equipment-page__back-text {
  color: var(--um-color-text-primary);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.4;
}

.equipment-page__scroll {
  display: flex;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding-top: var(--space-3);
}

@media (min-width: 768px) {
  .equipment-page {
    padding: var(--space-4);
  }

  .equipment-page__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-radius: 16px;
  }

  .equipment-page__label {
    font-size: 13px;
  }

  .equipment-page__title {
    font-size: 32px;
  }

  .equipment-page__subtitle {
    max-width: 720px;
    font-size: 15px;
  }

  .equipment-page__back {
    padding: 10px 18px;
    border-radius: 10px;
  }

  .equipment-page__back-text {
    font-size: 14px;
  }

  .equipment-page__scroll {
    padding-top: var(--space-4);
  }
}

@media (min-width: 1920px) {
  .equipment-page__header {
    min-height: 96px;
    padding-block: 14px;
  }
}
</style>
