<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
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
const refreshedAt = ref(new Date())
const morningRefreshHour = 6
const morningRefreshMinute = 20
let stopRouteQuerySync: (() => void) | null = null
let morningRefreshTimer: ReturnType<typeof globalThis.setTimeout> | null = null
let lastMorningRefreshKey = ''

const dashboardData = computed(() =>
  getDepartmentDashboardData(selectedDepartment.value, selectionConfig.value, refreshedAt.value),
)

function syncRouteQuery(
  query: Readonly<Record<string, string | undefined>> | undefined,
  config: CssMapSelectionConfig = selectionConfig.value,
): void {
  const departmentId = readQueryValue(query, 'departmentId')
  selectedDepartment.value = getCssMapDepartmentValue(departmentId, config)
}

onLoad(syncRouteQuery)

function handleSelectionLoadError(error: unknown): void {
  if (error instanceof Error) {
    console.warn(`[DepartmentDashboard] Selection refresh failed: ${error.message}`)
  }
}

function loadSelectionConfig(forceRefresh: boolean): void {
  loadCssMapSelectionConfig({ forceRefresh })
    .then((config) => {
      selectionConfig.value = config
      refreshedAt.value = new Date()
      syncRouteQuery(readCurrentFactoryRouteQuery(), config)
    })
    .catch(handleSelectionLoadError)
}

function refreshDashboard(): void {
  loadSelectionConfig(true)
}

function createMorningRefreshDate(date: Date): Date {
  const refreshDate = new Date(date)
  refreshDate.setHours(morningRefreshHour, morningRefreshMinute, 0, 0)

  return refreshDate
}

function createRefreshKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getNextMorningRefreshDelay(now: Date): number {
  const nextRefresh = createMorningRefreshDate(now)

  if (nextRefresh.getTime() <= now.getTime()) {
    nextRefresh.setDate(nextRefresh.getDate() + 1)
  }

  return nextRefresh.getTime() - now.getTime()
}

function clearMorningRefreshTimer(): void {
  if (morningRefreshTimer === null) {
    return
  }

  globalThis.clearTimeout(morningRefreshTimer)
  morningRefreshTimer = null
}

function scheduleMorningRefresh(): void {
  clearMorningRefreshTimer()
  morningRefreshTimer = globalThis.setTimeout(() => {
    const now = new Date()
    lastMorningRefreshKey = createRefreshKey(now)
    refreshDashboard()
    scheduleMorningRefresh()
  }, getNextMorningRefreshDelay(new Date()))
}

function refreshIfMorningWasMissed(): void {
  const now = new Date()
  const todayRefresh = createMorningRefreshDate(now)
  const todayKey = createRefreshKey(now)

  if (now.getTime() >= todayRefresh.getTime() && lastMorningRefreshKey !== todayKey) {
    lastMorningRefreshKey = todayKey
    refreshDashboard()
  }

  scheduleMorningRefresh()
}

onMounted(() => {
  syncRouteQuery(readCurrentFactoryRouteQuery())
  stopRouteQuerySync = subscribeFactoryRouteQueryChange(() => {
    syncRouteQuery(readCurrentFactoryRouteQuery())
  })

  loadSelectionConfig(false)
  refreshIfMorningWasMissed()
})

onShow(refreshIfMorningWasMissed)

onBeforeUnmount(() => {
  stopRouteQuerySync?.()
  stopRouteQuerySync = null
  clearMorningRefreshTimer()
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
    @refresh-dashboard="refreshDashboard"
  />
</template>
