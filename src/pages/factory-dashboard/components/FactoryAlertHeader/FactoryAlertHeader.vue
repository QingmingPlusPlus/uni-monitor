<script setup lang="ts">
import { computed } from 'vue'
import type { FactoryAlarmItem } from '../../data/factoryDashboardTypes'

const emptyAlarm: FactoryAlarmItem = {
  id: 'empty',
  level: 'neutral',
  source: '',
  message: '暂无异常信息',
  durationMinutes: 0,
  estimatedImpactMinutes: 0,
}

const props = withDefaults(defineProps<{
  readonly alarms: readonly FactoryAlarmItem[]
  readonly showBack?: boolean
}>(), {
  showBack: false,
})

const emit = defineEmits<{
  back: []
}>()

const visibleAlarms = computed(() =>
  props.alarms.length > 0 ? props.alarms : [emptyAlarm],
)
const shouldScroll = computed(() => props.alarms.length > 1)
const tickerSequences = computed(() => shouldScroll.value ? [0, 1] : [0])

function formatAlarmText(alarm: FactoryAlarmItem): string {
  const prefix = alarm.source ? `${alarm.source} ${alarm.message}` : alarm.message
  const durationText = alarm.durationMinutes > 0
    ? `，已超时 ${alarm.durationMinutes} 分钟`
    : ''
  const impactText = alarm.estimatedImpactMinutes > 0
    ? `，预计影响 ${alarm.estimatedImpactMinutes} 分钟`
    : ''

  return `${prefix}${durationText}${impactText}`
}
</script>

<template>
  <view class="factory-alert-header">
    <button
      v-if="showBack"
      class="factory-alert-header__back"
      type="button"
      @click="emit('back')"
    >
      返回
    </button>

    <text class="factory-alert-header__brand">Omni Monitor</text>

    <view
      class="factory-alert-header__ticker"
      :class="{ 'factory-alert-header__ticker--empty': alarms.length === 0 }"
    >
      <view class="factory-alert-header__label">
        <text class="factory-alert-header__dot"></text>
        <text>异常信息</text>
      </view>

      <view class="factory-alert-header__marquee">
        <view
          class="factory-alert-header__track"
          :class="{ 'factory-alert-header__track--static': !shouldScroll }"
        >
          <view
            v-for="sequence in tickerSequences"
            :key="sequence"
            class="factory-alert-header__sequence"
          >
            <view
              v-for="alarm in visibleAlarms"
              :key="`${sequence}-${alarm.id}`"
              class="factory-alert-header__alarm"
              :class="`factory-alert-header__alarm--${alarm.level}`"
            >
              <text class="factory-alert-header__bullet"></text>
              <text>{{ formatAlarmText(alarm) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.factory-alert-header {
  display: flex;
  width: 100%;
  min-height: 72rpx;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
  padding: 10rpx var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 8rpx;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.factory-alert-header__back {
  display: flex;
  min-width: 88rpx;
  height: 48rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 18rpx;
  border: 1px solid var(--um-color-operation);
  border-radius: 8rpx;
  background: var(--um-color-surface);
  color: var(--um-color-operation);
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1;
}

.factory-alert-header__back::after {
  border: 0;
}

.factory-alert-header__brand {
  flex-shrink: 0;
  color: var(--um-color-text-primary);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.factory-alert-header__ticker {
  display: flex;
  min-width: 0;
  height: 48rpx;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
  padding: 0 var(--space-2);
  border: 1px solid rgba(229, 83, 83, 0.24);
  border-radius: 999px;
  background: linear-gradient(90deg, #FDECEC 0%, #FFF9ED 100%);
  box-sizing: border-box;
}

.factory-alert-header__ticker--empty {
  border-color: var(--um-color-border);
  background: var(--um-color-surface-subtle);
}

.factory-alert-header__label {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8rpx;
  color: var(--um-color-danger);
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.factory-alert-header__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--um-color-danger);
  box-shadow: 0 0 0 6rpx rgba(229, 83, 83, 0.12);
}

.factory-alert-header__marquee {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.factory-alert-header__track {
  display: flex;
  width: max-content;
  align-items: center;
  animation: factory-alert-marquee 26s linear infinite;
}

.factory-alert-header__track--static {
  width: 100%;
  animation: none;
}

.factory-alert-header__sequence {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-4);
  padding-right: var(--space-4);
}

.factory-alert-header__track--static .factory-alert-header__sequence {
  min-width: 0;
  width: 100%;
  padding-right: 0;
}

.factory-alert-header__alarm {
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  gap: 8rpx;
  color: var(--um-color-text-primary);
  font-size: 23rpx;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.factory-alert-header__track--static .factory-alert-header__alarm {
  overflow: hidden;
  text-overflow: ellipsis;
}

.factory-alert-header__alarm--danger {
  color: var(--um-color-text-primary);
}

.factory-alert-header__alarm--warning {
  color: var(--um-color-text-primary);
}

.factory-alert-header__alarm--neutral {
  color: var(--um-color-text-secondary);
}

.factory-alert-header__bullet {
  width: 6rpx;
  height: 6rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.45;
}

@keyframes factory-alert-marquee {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

@media (min-width: 768px) {
  .factory-alert-header {
    min-height: 56px;
    gap: 18px;
    padding: 9px 18px;
    border-radius: 8px;
  }

  .factory-alert-header__back {
    min-width: 76px;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 15px;
  }

  .factory-alert-header__brand {
    font-size: 18px;
  }

  .factory-alert-header__ticker {
    height: 36px;
    gap: 18px;
    padding: 0 16px;
  }

  .factory-alert-header__label {
    gap: 8px;
    font-size: 14px;
  }

  .factory-alert-header__dot {
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 6px rgba(229, 83, 83, 0.12);
  }

  .factory-alert-header__sequence {
    gap: 36px;
    padding-right: 36px;
  }

  .factory-alert-header__alarm {
    gap: 8px;
    font-size: 15px;
  }

  .factory-alert-header__bullet {
    width: 4px;
    height: 4px;
  }
}

@media (max-width: 560px) {
  .factory-alert-header {
    flex-wrap: wrap;
  }

  .factory-alert-header__ticker {
    flex-basis: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .factory-alert-header__track {
    animation: none;
  }
}
</style>
