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
  invalidateDepartmentDashboardCache,
  loadAttendanceCard,
  loadAttendanceTrendCard,
  loadDepartmentDashboardData,
  loadInboundPlanTrendCard,
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

async function reloadDashboardData(): Promise<void> {
  const fallback = fallbackDashboardData.value
  try {
    const data = await loadDepartmentDashboardData(
      selectedDepartment.value,
      selectionConfig.value,
      refreshedAt.value,
      monthSegmentVersion.value,
      fallback,
    )
    dashboardData.value = data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DepartmentDashboard] 数据加载失败: ${error.message}`)
    }
    dashboardData.value = fallback
  }
}

watch(
  [selectedDepartment, selectionConfig, refreshedAt, monthSegmentVersion],
  () => {
    void reloadDashboardData()
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

function loadSelectionConfig(forceRefresh: boolean): void {
  loadCssMapSelectionConfig({ forceRefresh })
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

function loadMonthSegments(): void {
  loadMonthSegmentConfig()
    .then(() => {
      monthSegmentVersion.value += 1
    })
    .catch(handleMonthSegmentLoadError)
}

function refreshDashboard(): void {
  loadSelectionConfig(true)
  loadMonthSegments()
}

const DEPARTMENT_CARD_IDS: readonly DepartmentCardId[] = [
  'attendance',
  'attendanceTrend',
  'inboundPlanTrend',
  'personnelDetail',
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

  invalidateDepartmentDashboardCache(department, monthSegmentVersion.value)

  try {
    if (cardId === 'attendance') {
      const attendance = await loadAttendanceCard(department, processTypes, config, refreshedAt)
      dashboardData.value = { ...base, attendance }
      return
    }

    if (cardId === 'attendanceTrend') {
      const attendanceTrend = await loadAttendanceTrendCard(department, processTypes)
      if (attendanceTrend !== null) {
        dashboardData.value = { ...base, attendanceTrend }
      }
      return
    }

    if (cardId === 'inboundPlanTrend') {
      const inboundPlanTrend = await loadInboundPlanTrendCard(department, processTypes, {
        forceRefresh: true,
      })
      if (inboundPlanTrend !== null) {
        dashboardData.value = { ...base, inboundPlanTrend }
      }
      return
    }

    if (cardId === 'personnelDetail') {
      const personnelDetail = await loadPersonnelDetailCard(department, processTypes, config, refreshedAt)
      dashboardData.value = { ...base, personnelDetail }
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
  loadMonthSegments()
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
