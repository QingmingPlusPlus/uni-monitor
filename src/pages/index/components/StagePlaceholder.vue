<template>
  <view class="stage-placeholder">
    <view class="stage-placeholder__corner stage-placeholder__corner--top"></view>
    <view class="stage-placeholder__content">
      <text class="stage-placeholder__eyebrow">主展示区</text>
      <text class="stage-placeholder__title">大方块占位</text>
      <text class="stage-placeholder__description">
        预留给厂区平面图、主视觉、设备模型或核心数据总览。
      </text>
    </view>
    <view class="stage-placeholder__meta">
      <text>推荐比例 1:1</text>
      <text>触摸热区预留</text>
    </view>
  </view>
</template>

<style scoped>
.stage-placeholder {
  position: relative;
  display: flex;
  overflow: hidden;
  aspect-ratio: 1;
  min-height: 520rpx;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  border: 1px solid var(--um-color-border);
  border-radius: 18rpx;
  background:
    linear-gradient(135deg, var(--um-color-surface) 0%, var(--um-color-surface-subtle) 100%);
  box-sizing: border-box;
}

.stage-placeholder__corner {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  width: 104rpx;
  height: 104rpx;
  border-top: 4rpx solid var(--um-color-accent);
  border-right: 4rpx solid var(--um-color-accent);
}

.stage-placeholder__content {
  display: flex;
  max-width: 560rpx;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.stage-placeholder__eyebrow,
.stage-placeholder__description,
.stage-placeholder__meta {
  color: var(--um-color-text-secondary);
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.45;
}

.stage-placeholder__eyebrow {
  color: var(--um-color-accent);
  font-weight: 700;
}

.stage-placeholder__title {
  color: var(--um-color-text-primary);
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.2;
}

.stage-placeholder__meta {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-4);
  left: var(--space-4);
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

@media (min-width: 768px) {
  .stage-placeholder {
    min-height: 0;
    border-radius: 16px;
  }

  .stage-placeholder__corner {
    width: 64px;
    height: 64px;
    border-width: 3px;
  }

  .stage-placeholder__eyebrow,
  .stage-placeholder__description,
  .stage-placeholder__meta {
    font-size: 15px;
  }

  .stage-placeholder__title {
    font-size: 34px;
  }
}
</style>
