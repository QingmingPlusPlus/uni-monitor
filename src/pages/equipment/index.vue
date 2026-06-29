<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  CssMapDevice,
  CssMapDeviceChild,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  getCssMapDepartmentForProcess,
} from '../../components/css-map/css3dMapSelection'
import { loadCssMapSelectionConfig } from '../../components/css-map/css3dMapSelectionLoader'
import { loadCssMapData } from '../../components/css-map/css3dMapLiveData'
import EquipmentDetailView from '../factory-dashboard/components/EquipmentDetailView/EquipmentDetailView.vue'
import { getEquipmentAlarmItems } from '../factory-dashboard/data/factoryAlarmMock'
import { getEquipmentDetailData } from '../factory-dashboard/data/equipmentDetailMock'
import {
  buildDepartmentUrl,
  buildProcessUrl,
  parseRouteSource,
  readCurrentFactoryRouteQuery,
  readQueryValue,
  redirectToFactoryUrl,
  subscribeFactoryRouteQueryChange,
  type FactoryRouteSource,
} from '../factory-dashboard/utils/factoryRoutes'

const requestedDeviceId = ref('')
const source = ref<FactoryRouteSource>('department')
const devices = ref<readonly CssMapDevice[]>([])
const selectionConfig = ref<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
const loadError = ref('')
let stopRouteQuerySync: (() => void) | null = null

const activeDevice = computed<CssMapDevice | null>(() => {
  if (devices.value.length === 0) return null

  const requested = requestedDeviceId.value
  const directDevice = devices.value.find((device) => device.id === requested)
  if (directDevice) return directDevice

  const childDevice = findChildDevice(requested)
  if (childDevice) return childDevice

  return devices.value[0] ?? null
})

const detailData = computed(() =>
  getEquipmentDetailData(activeDevice.value, requestedDeviceId.value),
)
const alarmItems = computed(() =>
  getEquipmentAlarmItems(activeDevice.value, selectionConfig.value, requestedDeviceId.value),
)

function syncRouteQuery(query: Readonly<Record<string, string | undefined>> | undefined): void {
  requestedDeviceId.value = readQueryValue(query, 'deviceId') ?? ''
  source.value = parseRouteSource(readQueryValue(query, 'from'))
}

onLoad(syncRouteQuery)

onMounted(() => {
  syncRouteQuery(readCurrentFactoryRouteQuery())
  stopRouteQuerySync = subscribeFactoryRouteQueryChange(() => {
    syncRouteQuery(readCurrentFactoryRouteQuery())
  })

  loadCssMapSelectionConfig()
    .then((config) => {
      selectionConfig.value = config
      return loadCssMapData(config)
    })
    .then((mapData) => {
      devices.value = mapData.devices
    })
    .catch((error: unknown) => {
      loadError.value = error instanceof Error ? error.message : '设备数据加载失败'
    })
})

onBeforeUnmount(() => {
  stopRouteQuerySync?.()
  stopRouteQuerySync = null
})

function createDeviceFromChild(parent: CssMapDevice, child: CssMapDeviceChild): CssMapDevice {
  return {
    id: child.id,
    name: child.name,
    section: parent.section,
    x: parent.x,
    y: parent.y,
    w: parent.w,
    h: parent.h,
    deviceCode: child.deviceCode,
    deviceCodes: [child.deviceCode],
    children: [],
    runtime: child.runtime,
  }
}

function findChildDevice(deviceId: string): CssMapDevice | null {
  for (const parent of devices.value) {
    const child = parent.children.find((item) => item.id === deviceId)
    if (child) return createDeviceFromChild(parent, child)
  }

  return null
}

function getFallbackProcess(): CssMapProcessValue {
  return activeDevice.value?.section ?? selectionConfig.value.defaults.process
}

function handleBack(): void {
  const processId = getFallbackProcess()

  if (source.value === 'process') {
    redirectToFactoryUrl(buildProcessUrl(processId))
    return
  }

  const departmentId = activeDevice.value?.section
    ? getCssMapDepartmentForProcess(activeDevice.value.section, selectionConfig.value)
    : selectionConfig.value.defaults.department

  redirectToFactoryUrl(buildDepartmentUrl(departmentId))
}
</script>

<template>
  <view>
    <EquipmentDetailView
      :data="detailData"
      :alarms="alarmItems"
      @back="handleBack"
    />

    <view
      v-if="loadError"
      class="equipment-load-error"
    >
      {{ loadError }}
    </view>
  </view>
</template>

<style scoped>
.equipment-load-error {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 10;
  max-width: 520rpx;
  border: 1px solid var(--um-color-danger);
  border-radius: 10rpx;
  background: var(--um-color-surface);
  color: var(--um-color-danger);
  font-size: 24rpx;
  font-weight: 800;
  line-height: 1.4;
  padding: var(--space-2) var(--space-3);
}

@media (min-width: 768px) {
  .equipment-load-error {
    max-width: 420px;
    border-radius: 8px;
    font-size: 16px;
  }
}
</style>
