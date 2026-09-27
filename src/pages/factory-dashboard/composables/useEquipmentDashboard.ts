import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  CssMapDevice,
  CssMapDeviceChild,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  getCssMapDepartmentForProcess,
} from '../../../components/css-map/css3dMapSelection'
import { loadCssMapSelectionConfig } from '../../../components/css-map/css3dMapSelectionLoader'
import { loadCssMapData } from '../../../components/css-map/css3dMapLiveData'
import { getEquipmentAlarmItems } from '../data/factoryAlarmMock'
import { getEquipmentDetailData } from '../data/equipmentDetailMock'
import { loadEquipmentDetailData } from '../data/loaders/loadEquipmentDetailData'
import {
  buildDepartmentUrl,
  buildProcessUrl,
  parseRouteSource,
  readCurrentFactoryRouteQuery,
  readQueryValue,
  redirectToFactoryUrl,
  subscribeFactoryRouteQueryChange,
  type FactoryRouteSource,
  type FactoryTerminal,
} from '../utils/factoryRoutes'

export function useEquipmentDashboard(terminal: FactoryTerminal = 'screen') {
  const requestedDeviceId = ref('')
  const source = ref<FactoryRouteSource>('department')
  const devices = ref<readonly CssMapDevice[]>([])
  const selectionConfig = ref<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
  const loadError = ref('')
  let stopRouteQuerySync: (() => void) | null = null
  let detailLoadVersion = 0
  let disposed = false

  const activeDevice = computed<CssMapDevice | null>(() => {
    if (devices.value.length === 0) return null

    const requested = requestedDeviceId.value
    const directDevice = devices.value.find((device) => device.id === requested)
    if (directDevice) return directDevice

    const childDevice = findChildDevice(requested)
    if (childDevice) return childDevice

    return devices.value[0] ?? null
  })

  const detailData = ref(getEquipmentDetailData(null))
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

    void initializeDevices()
  })

  async function initializeDevices(): Promise<void> {
    try {
      const config = await loadCssMapSelectionConfig()
      if (disposed) return
      selectionConfig.value = config
      const mapData = await loadCssMapData(config)
      if (!disposed) devices.value = mapData.devices
    } catch (error: unknown) {
      if (!disposed) loadError.value = error instanceof Error ? error.message : '设备数据加载失败'
    }
  }

  onBeforeUnmount(() => {
    disposed = true
    detailLoadVersion += 1
    stopRouteQuerySync?.()
    stopRouteQuerySync = null
  })

  watch([activeDevice, requestedDeviceId], ([device]) => {
    const version = ++detailLoadVersion
    detailData.value = getEquipmentDetailData(device, requestedDeviceId.value)
    loadEquipmentDetailData(device, requestedDeviceId.value)
      .then((data) => {
        if (version === detailLoadVersion) detailData.value = data
      })
      .catch((error: unknown) => {
        console.warn('[Equipment] 设备详情实时数据加载失败', error)
      })
  }, { immediate: true })

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
      redirectToFactoryUrl(buildProcessUrl(processId, terminal))
      return
    }

    const departmentId = activeDevice.value?.section
      ? getCssMapDepartmentForProcess(activeDevice.value.section, selectionConfig.value)
      : selectionConfig.value.defaults.department

    redirectToFactoryUrl(buildDepartmentUrl(departmentId, terminal))
  }

  return { detailData, alarmItems, loadError, handleBack }
}
