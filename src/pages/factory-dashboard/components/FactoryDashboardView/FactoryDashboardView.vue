<script setup lang="ts">
import { ref } from 'vue'
import CssMapPanel from '../../../../components/css-map/index.vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import type {
  FactoryAlarmItem,
  FactoryDashboardData,
} from '../../data/factoryDashboardTypes'
import FactoryAlertHeader from '../FactoryAlertHeader/FactoryAlertHeader.vue'
import FactoryDashboardPanel from '../FactoryDashboardPanel/FactoryDashboardPanel.vue'

defineProps<{
  readonly data: FactoryDashboardData
  readonly alarms: readonly FactoryAlarmItem[]
  readonly selectionConfig: CssMapSelectionConfig
  readonly selectedDepartment: CssMapDepartmentValue
  readonly selectedProcess: CssMapProcessValue | null
}>()

const emit = defineEmits<{
  selectDepartment: [value: CssMapDepartmentValue]
  selectProcess: [value: CssMapProcessValue]
  clearProcess: []
  openDevice: [payload: { readonly deviceId: string }]
  refreshDashboard: [cardId: string]
}>()

const isMapExpanded = ref(false)

function openMapExpanded(): void {
  isMapExpanded.value = true
}

function closeMapExpanded(): void {
  isMapExpanded.value = false
}
</script>

<template>
  <view :class="['factory-dashboard-view', `factory-dashboard-view--${data.kind}`]">
    <FactoryAlertHeader :alarms="alarms" />

    <view class="factory-dashboard-view__body">
      <view class="factory-dashboard-view__map">
        <button
          class="factory-dashboard-view__map-expand"
          type="button"
          aria-label="展开地图"
          @click="openMapExpanded"
        >
          <svg class="factory-dashboard-view__map-expand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h6v2H8.41l3.3 3.29-1.42 1.42L7 8.41V11H5V5Zm8 0h6v6h-2V8.41l-3.29 3.3-1.42-1.42L15.59 7H13V5Zm4 10.59V13h2v6h-6v-2h2.59l-3.3-3.29 1.42-1.42L17 15.59ZM8.41 17H11v2H5v-6h2v2.59l3.29-3.3 1.42 1.42L8.41 17Z" />
          </svg>
        </button>
        <CssMapPanel
          :selection-config="selectionConfig"
          :selected-department="selectedDepartment"
          :selected-process="selectedProcess"
          @select-department="emit('selectDepartment', $event)"
          @select-process="emit('selectProcess', $event)"
          @clear-process="emit('clearProcess')"
          @open-device="emit('openDevice', $event)"
        />
      </view>

      <scroll-view
        class="factory-dashboard-view__panel-scroll"
        scroll-y
        :show-scrollbar="true"
      >
        <FactoryDashboardPanel
          :data="data"
          :selected-department="selectedDepartment"
          :selected-process="selectedProcess"
          @refresh="emit('refreshDashboard', $event)"
        />
      </scroll-view>
    </view>

    <view
      v-if="isMapExpanded"
      class="factory-dashboard-view__map-modal-layer"
      role="dialog"
      aria-modal="true"
      @click="closeMapExpanded"
    >
      <view class="factory-dashboard-view__map-modal" @click.stop>
        <button
          class="factory-dashboard-view__map-modal-close"
          type="button"
          aria-label="收起地图"
          @click="closeMapExpanded"
        >
          <svg class="factory-dashboard-view__map-expand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 16h3v3h2v-5H5v2Zm3-8H5v2h5V5H8v3Zm6 11h2v-3h3v-2h-5v5Zm2-11V5h-2v5h5V8h-3Z" />
          </svg>
        </button>
        <CssMapPanel
          :selection-config="selectionConfig"
          :selected-department="selectedDepartment"
          :selected-process="selectedProcess"
          @select-department="() => undefined"
          @select-process="() => undefined"
          @clear-process="() => undefined"
          @open-device="() => undefined"
        />
      </view>
    </view>
  </view>
</template>

<style scoped>
.factory-dashboard-view {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--um-color-page);
  box-sizing: border-box;
}

.factory-dashboard-view__body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.factory-dashboard-view__map,
.factory-dashboard-view__panel-scroll {
  min-width: 0;
  min-height: 0;
}

.factory-dashboard-view__map {
  display: flex;
  position: relative;
  flex-direction: column;
}

.factory-dashboard-view__map-expand,
.factory-dashboard-view__map-modal-close {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--um-color-border);
  border-radius: 10rpx;
  background: var(--um-color-surface);
  color: var(--um-color-text-secondary);
  line-height: 1;
  box-shadow: 0 8px 20px rgba(21, 43, 70, 0.12);
}

.factory-dashboard-view__map-expand::after,
.factory-dashboard-view__map-modal-close::after {
  display: none;
}

.factory-dashboard-view__map-expand {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 8;
}

.factory-dashboard-view__map-expand-icon {
  display: block;
  width: 32rpx;
  height: 32rpx;
  fill: currentcolor;
}

.factory-dashboard-view__map-modal-layer {
  display: flex;
  position: fixed;
  inset: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 4vh 4vw;
  background: rgba(16, 24, 32, 0.62);
  box-sizing: border-box;
}

.factory-dashboard-view__map-modal {
  position: relative;
  width: 80vw;
  height: 80vh;
  max-width: 2048px;
  max-height: 1152px;
  border: 1px solid var(--um-color-border);
  border-radius: 18px;
  background: var(--um-color-surface);
  box-shadow: 0 20px 56px rgba(16, 24, 32, 0.26);
  box-sizing: border-box;
}

.factory-dashboard-view__map-modal :deep(.css-map-panel) {
  height: 100%;
}

.factory-dashboard-view__map-modal-close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 10;
}

.factory-dashboard-view__panel-scroll {
  display: flex;
  overflow-y: auto;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .factory-dashboard-view {
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    padding: var(--space-4);
  }

  .factory-dashboard-view__body {
    grid-template-columns: minmax(520px, 0.9fr) minmax(520px, 1.1fr);
  }

  /*部门和工序维度统一为左侧地图占三分之一，右侧瀑布流占三分之二 */
  .factory-dashboard-view--department .factory-dashboard-view__body,
  .factory-dashboard-view--process .factory-dashboard-view__body {
    grid-template-columns: minmax(360px, 1fr) minmax(0, 2fr);
  }

  .factory-dashboard-view__map-expand,
  .factory-dashboard-view__map-modal-close {
    width: 44px;
    height: 44px;
    border-radius: 8px;
  }

  .factory-dashboard-view__map-expand-icon {
    width: 24px;
    height: 24px;
  }
}

@media (min-width: 1920px) {
  .factory-dashboard-view {
    gap: var(--space-2);
  }

  .factory-dashboard-view__body {
    grid-template-columns: minmax(860px, 0.95fr) minmax(760px, 1.05fr);
    gap: var(--space-4);
  }

  /*部门和工序维度统一为左侧地图占三分之一，右侧瀑布流占三分之二 */
  .factory-dashboard-view--department .factory-dashboard-view__body,
  .factory-dashboard-view--process .factory-dashboard-view__body {
    grid-template-columns: minmax(620px, 1fr) minmax(0, 2fr);
  }
}

@media (max-width: 767px) {
  .factory-dashboard-view__map-modal {
    width: 92vw;
    height: 86vh;
  }
}
</style>
