<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
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
import { getDepartmentAlarmItems } from '../factory-dashboard/data/factoryAlarmMock'
import {
  loadProductivityTrendCards,
  loadAttendanceCard,
  loadChangePointCard,
  loadAttendanceTrendCard,
  loadDepartmentDashboardData,
  loadInboundPlanTrendCard,
  loadProductionPlanTrendCard,
  loadPersonnelDetailCard,
} from '../factory-dashboard/data/factoryDashboardLoader'
import { getDepartmentDashboardData } from '../factory-dashboard/data/factoryDashboardMock'
import type { DepartmentCardId } from '../factory-dashboard/data/factoryDashboardTypes'
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

const selectedDepartment = ref<CssMapDepartmentValue>(defaultCssMapSelectionValues.department)
const selectionConfig = ref<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
const refreshedAt = ref(new Date())
const monthSegmentVersion = ref(0)
const dashboardReady = ref(false)
let disposed = false
const morningRefreshHour = 6
const morningRefreshMinute = 20
let stopRouteQuerySync: (() => void) | null = null
let morningRefreshTimer: ReturnType<typeof globalThis.setTimeout> | null = null
let lastMorningRefreshKey = ''

const fallbackDashboardData = computed(() =>
  getDepartmentDashboardData(
    selectedDepartment.value,
    selectionConfig.value,
    refreshedAt.value,
    monthSegmentVersion.value,
  ),
)
const dashboardData = shallowRef(fallbackDashboardData.value)
const alarmItems = computed(() =>
  getDepartmentAlarmItems(selectedDepartment.value, selectionConfig.value),
)

let dashboardRequestVersion = 0

async function reloadDashboardData(): Promise<void> {
  const requestVersion = ++dashboardRequestVersion
  const fallback = fallbackDashboardData.value
  dashboardData.value = fallback
  void loadChangePointCard(selectedDepartment.value, selectionConfig.value.departmentProcessMap[selectedDepartment.value] ?? [], new Date()).then(changePoint => {
    if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, changePoint }
  })
  try {
    const data = await loadDepartmentDashboardData(
      selectedDepartment.value,
      selectionConfig.value,
      refreshedAt.value,
      monthSegmentVersion.value,
      fallback,
    )
    if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...data, changePoint: dashboardData.value.changePoint }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentDashboard] 数据加载失败: ${error.message}`)
    }
    if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...fallback, changePoint: dashboardData.value.changePoint }
  }
}

watch(
  [dashboardReady, selectedDepartment, selectionConfig, refreshedAt, monthSegmentVersion],
  () => {
    if (dashboardReady.value) void reloadDashboardData()
  },
  { immediate: true },
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

function loadSelectionConfig(forceRefresh: boolean): Promise<void> {
  return loadCssMapSelectionConfig({ forceRefresh })
    .then((config) => {
      selectionConfig.value = config
      refreshedAt.value = new Date()
      syncRouteQuery(readCurrentFactoryRouteQuery(), config)
    })
    .catch(handleSelectionLoadError)
}

function handleMonthSegmentLoadError(error: unknown): void {
  if (error instanceof Error) {
    console.warn(`[DepartmentDashboard] Month segment refresh failed: ${error.message}`)
    return
  }

  throw error
}

function loadMonthSegments(): Promise<void> {
  return loadMonthSegmentConfig()
    .then(() => {
      monthSegmentVersion.value += 1
    })
    .catch(handleMonthSegmentLoadError)
}

let refreshPending: Promise<void> | null = null
function refreshDashboard(forceRefresh = true): Promise<void> {
  if (refreshPending) return refreshPending
  dashboardReady.value = false
  refreshPending = Promise.allSettled([loadSelectionConfig(forceRefresh), loadMonthSegments()])
    .then(() => {
      if (!disposed) dashboardReady.value = true
    })
    .finally(() => { refreshPending = null })
  return refreshPending
}

const DEPARTMENT_CARD_IDS: readonly DepartmentCardId[] = [
  'attendance',
  'attendanceTrend',
  'inboundPlanTrend',
  'personnelDetail',
  'productionPlanTrend',
  'changePoint',
  'productivityTrend',
]

function isDepartmentCardId(value: unknown): value is DepartmentCardId {
  return typeof value === 'string' && (DEPARTMENT_CARD_IDS as readonly string[]).includes(value)
}

function handleCardRefreshError(cardId: DepartmentCardId, error: unknown): void {
  if (error instanceof Error) {
    console.warn(`[DepartmentDashboard] 卡片刷新失败 (${cardId}): ${error.message}`)
  }
}

async function refreshCard(cardId: string): Promise<void> {
  if (!isDepartmentCardId(cardId)) {
    return
  }

  const department = selectedDepartment.value
  const config = selectionConfig.value
  const processTypes = config.departmentProcessMap[department] ?? []
  const refreshedAt = new Date()
  const base = dashboardData.value
  const requestVersion = dashboardRequestVersion

  try {
    if (cardId === 'changePoint') {
      if (base.changePoint.status === 'loading') return
      dashboardData.value = { ...dashboardData.value, changePoint: { ...base.changePoint, status: 'loading' } }
      const changePoint = await loadChangePointCard(department, processTypes, refreshedAt)
      if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, changePoint }
      return
    }

    if (cardId === 'attendance') {
      const attendance = await loadAttendanceCard(department, processTypes, config, refreshedAt)
      if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, attendance }
      return
    }

    if (cardId === 'attendanceTrend') {
      const attendanceTrend = await loadAttendanceTrendCard(department, processTypes)
      if (attendanceTrend !== null) {
        if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, attendanceTrend }
      }
      return
    }

    if (cardId === 'inboundPlanTrend') {
      const inboundPlanTrend = await loadInboundPlanTrendCard(department, processTypes, {
        forceRefresh: true,
      })
      if (inboundPlanTrend !== null) {
        if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, inboundPlanTrend }
      }
      return
    }

    if (cardId === 'personnelDetail') {
      const personnelDetail = await loadPersonnelDetailCard(department, processTypes, config, refreshedAt)
      if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, personnelDetail }
      return
    }

    if (cardId === 'productionPlanTrend') {
      const productionPlanTrend = await loadProductionPlanTrendCard(department, processTypes, {
        forceRefresh: true,
      })
      if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, productionPlanTrend }
      return
    }

    if (cardId === 'productivityTrend') {
      const productionPlanTrends = await loadProductivityTrendCards(department, processTypes, config, { forceRefresh: true })
      if (requestVersion === dashboardRequestVersion) dashboardData.value = { ...dashboardData.value, productionPlanTrends }
    }
  } catch (error: unknown) {
    handleCardRefreshError(cardId, error)
  }
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
  if (!dashboardReady.value) return
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

  lastMorningRefreshKey = createRefreshKey(new Date())
  void refreshDashboard(false)
  scheduleMorningRefresh()
})

onShow(refreshIfMorningWasMissed)

onBeforeUnmount(() => {
  disposed = true
  dashboardRequestVersion += 1
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

function clearProcess(): void {
  redirectToFactoryUrl(buildDepartmentUrl(selectedDepartment.value))
}

function openDevice(payload: { readonly deviceId: string }): void {
  navigateToFactoryUrl(buildEquipmentUrl(payload.deviceId, 'department'))
}
</script>

<template>
  <FactoryDashboardView
    :data="dashboardData"
    :alarms="alarmItems"
    :selection-config="selectionConfig"
    :selected-department="selectedDepartment"
    :selected-process="null"
    @select-department="selectDepartment"
    @select-process="selectProcess"
    @clear-process="clearProcess"
    @open-device="openDevice"
    @refresh-dashboard="refreshCard"
  />
</template>
