<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionValues,
  getCssMapDepartmentForProcess,
  isCssMapProcessValue,
} from '../../components/css-map/css3dMapSelection'
import FactoryDashboardView from '../factory-dashboard/components/FactoryDashboardView/FactoryDashboardView.vue'
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

const selectedProcess = ref<CssMapProcessValue>('pretreatment1')
let stopRouteQuerySync: (() => void) | null = null

const selectedDepartment = computed<CssMapDepartmentValue>(() =>
  getCssMapDepartmentForProcess(selectedProcess.value),
)
const dashboardData = computed(() => getProcessDashboardData(selectedProcess.value))

function syncRouteQuery(query: Readonly<Record<string, string | undefined>> | undefined): void {
  const processId = readQueryValue(query, 'processId')
  selectedProcess.value = isCssMapProcessValue(processId)
    ? processId
    : 'pretreatment1'
}

onLoad(syncRouteQuery)

onMounted(() => {
  syncRouteQuery(readCurrentFactoryRouteQuery())
  stopRouteQuerySync = subscribeFactoryRouteQueryChange(() => {
    syncRouteQuery(readCurrentFactoryRouteQuery())
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

function openDevice(payload: { readonly deviceId: string }): void {
  navigateToFactoryUrl(buildEquipmentUrl(payload.deviceId, 'process'))
}
</script>

<template>
  <FactoryDashboardView
    :data="dashboardData"
    :selected-department="selectedDepartment"
    :selected-process="selectedProcess"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @open-device="openDevice"
  />
</template>
