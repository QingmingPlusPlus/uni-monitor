<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  defaultCssMapSelectionValues,
  getCssMapDepartmentForProcess,
  getCssMapProcessValue,
} from '../../components/css-map/css3dMapSelection'
import { loadCssMapSelectionConfig } from '../../components/css-map/css3dMapSelectionLoader'
import FactoryDashboardView from '../factory-dashboard/components/FactoryDashboardView/FactoryDashboardView.vue'
import { getProcessAlarmItems } from '../factory-dashboard/data/factoryAlarmMock'
import { getProcessDashboardData } from '../factory-dashboard/data/factoryDashboardMock'
import {
  invalidateProcessDashboardCache,
  loadProcessDashboardData,
} from '../factory-dashboard/data/factoryDashboardLoader'
import {
  buildDepartmentUrl,
  buildEquipmentUrl,
  buildProcessUrl,
  navigateToFactoryUrl,
  readCurrentFactoryRouteQuery,
  readQueryValue,
  redirectToFactoryUrl,
  subscribeFactoryRouteQueryChange,
} from '../factory-dashboard/utils/factoryRoutes'
import { loadMonthSegmentConfig } from '../../utils/monthSegment'

const selectedProcess = ref<CssMapProcessValue>(defaultCssMapSelectionValues.process)
const selectionConfig = ref<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
const refreshedAt = ref(new Date())
const monthSegmentVersion = ref(0)
let stopRouteQuerySync: (() => void) | null = null

const selectedDepartment = computed<CssMapDepartmentValue>(() =>
  getCssMapDepartmentForProcess(selectedProcess.value, selectionConfig.value),
)
const fallbackDashboardData = computed(() =>
  getProcessDashboardData(selectedProcess.value, selectionConfig.value, refreshedAt.value),
)
const dashboardData = shallowRef(fallbackDashboardData.value)
const alarmItems = computed(() =>
  getProcessAlarmItems(selectedProcess.value, selectionConfig.value),
)

async function reloadDashboardData(): Promise<void> {
  const fallback = fallbackDashboardData.value
  try {
    const data = await loadProcessDashboardData(
      selectedProcess.value,
      selectedDepartment.value,
      selectionConfig.value,
      refreshedAt.value,
      monthSegmentVersion.value,
      fallback,
    )
    dashboardData.value = data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[ProcessDashboard] 数据加载失败: ${error.message}`)
    }
    dashboardData.value = fallback
  }
}

watch(
  [selectedProcess, selectedDepartment, selectionConfig, refreshedAt, monthSegmentVersion],
  () => {
    void reloadDashboardData()
  },
  { immediate: true },
)

function syncRouteQuery(
  query: Readonly<Record<string, string | undefined>> | undefined,
  config: CssMapSelectionConfig = selectionConfig.value,
): void {
  const processId = readQueryValue(query, 'processId')
  selectedProcess.value = getCssMapProcessValue(processId, config)
}

onLoad(syncRouteQuery)

function handleMonthSegmentLoadError(error: unknown): void {
  if (error instanceof Error) {
    console.warn(`[ProcessDashboard] Month segment refresh failed: ${error.message}`)
    return
  }

  throw error
}

function loadMonthSegments(): void {
  loadMonthSegmentConfig()
    .then(() => {
      monthSegmentVersion.value += 1
    })
    .catch(handleMonthSegmentLoadError)
}

onMounted(() => {
  syncRouteQuery(readCurrentFactoryRouteQuery())
  stopRouteQuerySync = subscribeFactoryRouteQueryChange(() => {
    syncRouteQuery(readCurrentFactoryRouteQuery())
  })

  loadCssMapSelectionConfig()
    .then((config) => {
      selectionConfig.value = config
      syncRouteQuery(readCurrentFactoryRouteQuery(), config)
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        selectionConfig.value = defaultCssMapSelectionConfig
      }
    })

  loadMonthSegments()
})

onBeforeUnmount(() => {
  stopRouteQuerySync?.()
  stopRouteQuerySync = null
})

function selectDepartment(value: CssMapDepartmentValue): void {
  redirectToFactoryUrl(buildDepartmentUrl(value))
}

function selectProcess(value: CssMapProcessValue): void {
  selectedProcess.value = value
  redirectToFactoryUrl(buildProcessUrl(value))
}

function clearProcess(): void {
  redirectToFactoryUrl(buildDepartmentUrl(selectedDepartment.value))
}

function openDevice(payload: { readonly deviceId: string }): void {
  navigateToFactoryUrl(buildEquipmentUrl(payload.deviceId, 'process'))
}

function refreshDashboard(_cardId: string): void {
  refreshedAt.value = new Date()
  invalidateProcessDashboardCache(selectedProcess.value, monthSegmentVersion.value)
  void reloadDashboardData()
}
</script>

<template>
  <FactoryDashboardView
    :data="dashboardData"
    :alarms="alarmItems"
    :selection-config="selectionConfig"
    :selected-department="selectedDepartment"
    :selected-process="selectedProcess"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @clear-process="clearProcess"
    @open-device="openDevice"
    @refresh-dashboard="refreshDashboard"
  />
</template>
