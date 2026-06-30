<template>
  <view class="production-summary-card">
    <view class="production-summary-card__head">
      <text class="production-summary-card__title">{{ data.title }}</text>
    </view>

    <view class="production-summary-card__grid">
      <view class="production-summary-card__column">
        <view
          v-for="line in data.left"
          :key="line.id"
          :class="['production-summary-card__line', { 'production-summary-card__line--indent': line.indent }]"
        >
          <text class="production-summary-card__label">{{ line.label }}</text>
          <text class="production-summary-card__value">{{ line.value }}</text>
          <text class="production-summary-card__rate">{{ line.rate }}</text>
        </view>
      </view>

      <view class="production-summary-card__column">
        <view
          v-for="line in data.right"
          :key="line.id"
          class="production-summary-card__line"
        >
          <text class="production-summary-card__label">{{ line.label }}</text>
          <text class="production-summary-card__value">{{ line.value }}</text>
          <text class="production-summary-card__rate">{{ line.rate }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { FactorySummaryData } from '../../data/factoryDashboardTypes'

defineProps<{
  readonly data: FactorySummaryData
}>()
</script>

<style scoped>
.production-summary-card {
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

.production-summary-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.production-summary-card__title {
  color: var(--um-color-text-primary);
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.25;
}

.production-summary-card__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.production-summary-card__column {
  display: grid;
  gap: var(--space-1);
}

.production-summary-card__line {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(126rpx, 1fr) minmax(128rpx, auto) minmax(96rpx, auto);
  align-items: baseline;
  gap: var(--space-2);
  color: var(--um-color-text-primary);
  font-variant-numeric: tabular-nums;
}

.production-summary-card__line--indent .production-summary-card__label {
  padding-left: 56rpx;
}

.production-summary-card__label {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 28rpx;
  font-weight: 650;
  line-height: 1.32;
}

.production-summary-card__value,
.production-summary-card__rate {
  justify-self: end;
  white-space: nowrap;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.25;
}

.production-summary-card__rate {
  color: var(--um-color-operation);
}

@media (min-width: 768px) {
  .production-summary-card {
    border-radius: 16px;
  }

  .production-summary-card__title {
    font-size: 30px;
  }

  .production-summary-card__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
  }

  .production-summary-card__line {
    grid-template-columns: minmax(136px, 1fr) minmax(132px, auto) minmax(84px, auto);
    gap: 14px;
  }

  .production-summary-card__line--indent .production-summary-card__label {
    padding-left: 42px;
  }

  .production-summary-card__label {
    font-size: 19px;
  }

  .production-summary-card__value,
  .production-summary-card__rate {
    font-size: 21px;
  }
}
</style>
