<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
  buildDepartmentUrl,
  buildEquipmentUrl,
  buildProcessUrl,
  navigateToFactoryUrl,
  readCurrentFactoryRouteQuery,
  readQueryValue,
  redirectToFactoryUrl,
  subscribeFactoryRouteQueryChange,
} from '../factory-dashboard/utils/factoryRoutes'

const selectedProcess = ref<CssMapProcessValue>(defaultCssMapSelectionValues.process)
const selectionConfig = ref<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
const refreshedAt = ref(new Date())
let stopRouteQuerySync: (() => void) | null = null

const selectedDepartment = computed<CssMapDepartmentValue>(() =>
  getCssMapDepartmentForProcess(selectedProcess.value, selectionConfig.value),
)
const dashboardData = computed(() =>
  getProcessDashboardData(selectedProcess.value, selectionConfig.value, refreshedAt.value),
)
const alarmItems = computed(() =>
  getProcessAlarmItems(selectedProcess.value, selectionConfig.value),
)

function syncRouteQuery(
  query: Readonly<Record<string, string | undefined>> | undefined,
  config: CssMapSelectionConfig = selectionConfig.value,
): void {
  const processId = readQueryValue(query, 'processId')
  selectedProcess.value = getCssMapProcessValue(processId, config)
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
      syncRouteQuery(readCurrentFactoryRouteQuery(), config)
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        selectionConfig.value = defaultCssMapSelectionConfig
      }
    })
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

function refreshDashboard(): void {
  refreshedAt.value = new Date()
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
