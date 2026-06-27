<template>
  <view class="home-content">
    <view class="home-content__block">
      <view class="home-content__stage">
        <StagePlaceholder />
      </view>
      <view class="home-content__waterfall">
        <view class="home-content__waterfall-head">
          <text class="home-content__title">展位瀑布流</text>
          <text class="home-content__note">重点、开放、维护与空闲状态统一呈现</text>
        </view>
        <BoothWaterfall />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import BoothWaterfall from "./BoothWaterfall.vue"
import StagePlaceholder from "./StagePlaceholder.vue"
</script>

<style scoped>
.home-content {
  display: flex;
  min-height: 0;
  flex: 1;
}

.home-content__block {
  display: grid;
  width: 100%;
  min-height: 0;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--um-color-border);
  border-radius: 20rpx;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.home-content__stage,
.home-content__waterfall {
  min-width: 0;
}

.home-content__waterfall {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: var(--space-3);
}

.home-content__waterfall-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--um-color-rail);
}

.home-content__title {
  color: var(--um-color-text-primary);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.3;
}

.home-content__note {
  color: var(--um-color-text-secondary);
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.45;
}

@media (min-width: 768px) {
  .home-content__block {
    border-radius: 16px;
  }

  .home-content__title {
    font-size: 20px;
  }

  .home-content__note {
    font-size: 14px;
  }
}

@media (min-width: 1024px) {
  .home-content__block {
    grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.08fr);
    align-items: start;
  }
}

@media (min-width: 1920px) {
  .home-content__block {
    grid-template-columns: minmax(720px, 0.84fr) minmax(0, 1.16fr);
    gap: var(--space-5);
  }
}
</style>
