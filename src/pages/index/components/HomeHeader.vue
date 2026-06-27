<template>
  <view class="home-header">
    <view class="home-header__copy">
      <text class="home-header__label">Factory Exhibition Board</text>
      <text class="home-header__title">工厂项目展位总览</text>
      <text class="home-header__subtitle">
        集中呈现工厂项目展位、主视觉占位与现场展示状态，适配大屏浏览。
      </text>
    </view>

    <view class="home-header__status-grid">
      <view
        v-for="item in headerStats"
        :key="item.label"
        class="home-header__status"
      >
        <text class="home-header__status-label">{{ item.label }}</text>
        <text class="home-header__status-value">{{ item.value }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { boothCards } from "./boothData"

const headerStats = [
  { label: "展区", value: "A 区工厂项目" },
  { label: "展位", value: `${boothCards.length} 个展位` },
  { label: "状态", value: "今日巡展" },
] as const
</script>

<style scoped>
.home-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 18rpx;
  background: var(--um-color-surface);
}

.home-header__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.home-header__label {
  color: var(--um-color-accent);
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.4;
}

.home-header__title {
  color: var(--um-color-text-primary);
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.25;
}

.home-header__subtitle {
  max-width: 760rpx;
  color: var(--um-color-text-secondary);
  font-size: 26rpx;
  line-height: 1.5;
}

.home-header__status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-2);
}

.home-header__status {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4rpx;
  padding: var(--space-2);
  border: 1px solid var(--um-color-border);
  border-radius: 12rpx;
  background: var(--um-color-surface-subtle);
}

.home-header__status-label {
  color: var(--um-color-text-secondary);
  font-size: 22rpx;
  line-height: 1.3;
}

.home-header__status-value {
  color: var(--um-color-text-primary);
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .home-header {
    flex-direction: row;
    align-items: stretch;
    justify-content: space-between;
  }

  .home-header__copy {
    justify-content: center;
  }

  .home-header__label {
    font-size: 13px;
  }

  .home-header__title {
    font-size: 32px;
  }

  .home-header__subtitle {
    max-width: 720px;
    font-size: 15px;
  }

  .home-header__status-grid {
    width: min(42vw, 720px);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .home-header__status {
    padding: 12px 14px;
  }

  .home-header__status-label {
    font-size: 12px;
  }

  .home-header__status-value {
    font-size: 14px;
  }
}

@media (min-width: 1920px) {
  .home-header {
    min-height: 96px;
    padding-block: 14px;
  }
}
</style>
