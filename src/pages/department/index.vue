<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
} from '../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionValues,
  isCssMapDepartmentValue,
} from '../../components/css-map/css3dMapSelection'
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
let stopRouteQuerySync: (() => void) | null = null

const dashboardData = computed(() => getDepartmentDashboardData(selectedDepartment.value))

function syncRouteQuery(query: Readonly<Record<string, string | undefined>> | undefined): void {
  const departmentId = readQueryValue(query, 'departmentId')
  selectedDepartment.value = isCssMapDepartmentValue(departmentId)
    ? departmentId
    : defaultCssMapSelectionValues.department
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
    :selected-department="selectedDepartment"
    :selected-process="null"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @open-device="openDevice"
  />
</template>
