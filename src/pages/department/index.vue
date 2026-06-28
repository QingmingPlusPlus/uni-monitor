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
  getCssMapDepartmentValue,
} from '../../components/css-map/css3dMapSelection'
import { loadCssMapSelectionConfig } from '../../components/css-map/css3dMapSelectionLoader'
import FactoryDashboardView from '../factory-dashboard/components/FactoryDashboardView/FactoryDashboardView.vue'
import { getDepartmentDashboardData } from '../factory-dashboard/data/factoryDashboardMock'
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

const selectedDepartment = ref<CssMapDepartmentValue>(defaultCssMapSelectionValues.department)
const selectionConfig = ref<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
let stopRouteQuerySync: (() => void) | null = null

const dashboardData = computed(() =>
  getDepartmentDashboardData(selectedDepartment.value, selectionConfig.value),
)

function syncRouteQuery(
  query: Readonly<Record<string, string | undefined>> | undefined,
  config: CssMapSelectionConfig = selectionConfig.value,
): void {
  const departmentId = readQueryValue(query, 'departmentId')
  selectedDepartment.value = getCssMapDepartmentValue(departmentId, config)
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
  selectedDepartment.value = value
  redirectToFactoryUrl(buildDepartmentUrl(value))
}

function selectProcess(value: CssMapProcessValue): void {
  redirectToFactoryUrl(buildProcessUrl(value))
}

function openDevice(payload: { readonly deviceId: string }): void {
  navigateToFactoryUrl(buildEquipmentUrl(payload.deviceId, 'department'))
}
</script>

<template>
  <FactoryDashboardView
    :data="dashboardData"
    :selection-config="selectionConfig"
    :selected-department="selectedDepartment"
    :selected-process="null"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @open-device="openDevice"
  />
</template>
