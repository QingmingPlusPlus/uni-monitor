<script setup lang="ts">
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
</script>

<template>
  <view :class="['factory-dashboard-view', `factory-dashboard-view--${data.kind}`]">
    <FactoryAlertHeader :alarms="alarms" />

    <view class="factory-dashboard-view__body">
      <view class="factory-dashboard-view__map">
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
          @refresh="emit('refreshDashboard', $event)"
        />
      </scroll-view>
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
  flex-direction: column;
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

  .factory-dashboard-view--department .factory-dashboard-view__body {
    grid-template-columns: minmax(360px, 1fr) minmax(0, 2fr);
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

  .factory-dashboard-view--department .factory-dashboard-view__body {
    grid-template-columns: minmax(620px, 1fr) minmax(0, 2fr);
  }
}
</style>
