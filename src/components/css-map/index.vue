<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useCssMapSelection } from '../../composables/useCssMapSelection'
import { useViewLevel } from '../../composables/useViewLevel'
import {
  requestDeviceViewNavigation,
  requestViewLevelNavigation,
} from '../../composables/useViewLevelNavigation'
import CssMapDisplaySettingsDialog from './CssMapDisplaySettingsDialog.vue'
import CssMapEquipmentNode from './CssMapEquipmentNode.vue'
import CssMapStaffShiftPie from './CssMapStaffShiftPie.vue'
import { createCss3dMapScene, type Css3dMapScene } from './css3dMapScene'
import {
  cssMapStatusPalette,
  getCssMapLoadRateBackground,
  getCssMapStaffColor,
  getCssMapStaffShiftAngle,
} from './css3dMapPalette'
import {
  cssMapDepartmentOptions,
  cssMapDepartmentProcessMap,
  cssMapProcessOptions,
} from './css3dMapSelection'
import {
  getCssMapProcessBoundaryFocusRect,
  getCssMapProcessBoundaryGroupFocusRect,
} from './css3dMapProcessBoundaries'
import { loadCssMapData } from './css3dMapLiveData'
import type {
  CssMapDepartmentValue,
  CssMapDevice,
  CssMapDeviceChild,
  CssMapDeviceScreenRect,
  CssMapDeviceStatus,
  CssMapDisplayOptions,
  CssMapProcessBoundary,
  CssMapProcessValue,
  CssMapSize,
} from './css3dMapTypes'

defineOptions({
  name: 'CssMapPanel',
})

const { t } = useI18n()
const { viewLevel } = useViewLevel()
const {
  department,
  process,
  activeSelectionMode,
  setDepartment,
  setProcess,
  clearProcess,
} = useCssMapSelection()
const mapContainer = ref<HTMLElement | null>(null)
const deviceElements = ref<HTMLElement[]>([])
const cssMapDevices = ref<CssMapDevice[]>([])
const cssMapSections = ref<CssMapProcessBoundary[]>([])
const cssMapSize = ref<CssMapSize | null>(null)
const deviceScreenRects = reactive<Record<string, CssMapDeviceScreenRect>>({})
const settingsOpen = ref(false)
const displayOptions = reactive<CssMapDisplayOptions>({
  showStatusColor: true,
  showLoadRateColor: true,
  showStaffing: true,
  showFiveMChanges: true,
})

const loadRateLegendItems = [
  { labelKey: 'cssMap.legend.loadRateRanges.le30', color: getCssMapLoadRateBackground(30) },
  { labelKey: 'cssMap.legend.loadRateRanges.from31To40', color: getCssMapLoadRateBackground(40) },
  { labelKey: 'cssMap.legend.loadRateRanges.from41To60', color: getCssMapLoadRateBackground(60) },
  { labelKey: 'cssMap.legend.loadRateRanges.from61To80', color: getCssMapLoadRateBackground(80) },
  { labelKey: 'cssMap.legend.loadRateRanges.from81To100', color: getCssMapLoadRateBackground(100) },
  { labelKey: 'cssMap.legend.loadRateRanges.gt100', color: getCssMapLoadRateBackground(101) },
]

const statusLegendStatuses: CssMapDeviceStatus[] = [
  'production',
  'abnormalStop',
  'plannedStop',
  'changeover',
  'cleaning',
  'neutral',
]

const statusLegendItems = statusLegendStatuses.map((status) => ({
  status,
  color: cssMapStatusPalette[status].background,
}))

const staffShiftLegendItems = [
  {
    shift: 'short',
    shapeLabelKey: 'cssMap.legend.staffingShiftShapes.short',
  },
  {
    shift: 'full',
    shapeLabelKey: 'cssMap.legend.staffingShiftShapes.full',
  },
] as const

const DEVICE_NAVIGATION_DOUBLE_TAP_MS = 420
const DEVICE_NAVIGATION_MOVE_TOLERANCE = 10
const DEVICE_NAVIGATION_TAP_DISTANCE = 28

let scene: Css3dMapScene | null = null
let deviceNavigationPointerDown: {
  key: string
  pointerId: number
  x: number
  y: number
} | null = null
let deviceNavigationLastTap: {
  key: string
  time: number
  x: number
  y: number
} | null = null

const departmentSelectOptions = computed(() => cssMapDepartmentOptions.map((option) => ({
  label: t(option.labelKey),
  value: option.value,
})))

const selectedDepartmentValue = computed({
  get: () => department.value,
  set: (value: CssMapDepartmentValue) => selectDepartment(value),
})

const selectedProcessValue = computed<CssMapProcessValue | null>({
  get: () => process.value,
  set: (value) => selectProcess(value),
})

const availableProcessValues = computed(() => cssMapDepartmentProcessMap[department.value])

const processSelectOptions = computed(() =>
  cssMapProcessOptions
    .filter((option) => availableProcessValues.value.includes(option.value))
    .map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    })),
)

function getDeviceLayoutKey(device: CssMapDevice) {
  return `${device.id}-${device.x}-${device.y}-${device.w}-${device.h}`
}

function setDisplayOptions(options: CssMapDisplayOptions) {
  Object.assign(displayOptions, options)
  scene?.render()
}

function focusProcessBoundary(value: CssMapProcessValue) {
  const rect = getCssMapProcessBoundaryFocusRect(cssMapSections.value, value)
  if (!rect) return

  scene?.focusRect(rect)
}

function focusDepartmentBoundary(value: CssMapDepartmentValue) {
  const rect = getCssMapProcessBoundaryGroupFocusRect(
    cssMapSections.value,
    cssMapDepartmentProcessMap[value],
  )
  if (!rect) return

  scene?.focusRect(rect)
}

function setDeviceScreenRects(rects: Record<string, CssMapDeviceScreenRect>) {
  Object.keys(deviceScreenRects).forEach((deviceId) => {
    if (!rects[deviceId]) {
      delete deviceScreenRects[deviceId]
    }
  })

  Object.entries(rects).forEach(([deviceId, rect]) => {
    deviceScreenRects[deviceId] = rect
  })
}

function getDeviceScreenRect(device: CssMapDevice): CssMapDeviceScreenRect {
  return deviceScreenRects[getDeviceLayoutKey(device)] ?? {
    width: device.w,
    height: device.h,
    scale: 1,
  }
}

function selectDepartment(value: CssMapDepartmentValue) {
  setDepartment(value)
  requestViewLevelNavigation('department')
  focusDepartmentBoundary(value)
}

function selectProcess(value: CssMapProcessValue | null | undefined | '') {
  if (!value) {
    clearProcess()
    requestViewLevelNavigation('department')
    focusDepartmentBoundary(department.value)
    return
  }

  if (!availableProcessValues.value.includes(value)) return

  setProcess(value)
  requestViewLevelNavigation('process')
  focusProcessBoundary(value)
}

function collectNavigationDeviceCodes(device: CssMapDevice) {
  return Array.from(new Set([
    ...device.deviceCodes,
    ...device.children.map((child) => child.deviceCode),
  ].filter((code) => code.trim())))
}

function navigateToDeviceView(device: CssMapDevice, event?: Event) {
  event?.preventDefault()
  deviceNavigationPointerDown = null
  deviceNavigationLastTap = null
  const deviceCodes = collectNavigationDeviceCodes(device)
  const isDeviceGroup = deviceCodes.length > 1 || device.children.length > 0

  requestDeviceViewNavigation(viewLevel.value, {
    targetType: isDeviceGroup ? 'deviceGroup' : 'device',
    deviceId: device.id,
    deviceCode: deviceCodes.length === 1 ? deviceCodes[0] : device.deviceCode,
    deviceCodes: isDeviceGroup ? deviceCodes : undefined,
    deviceName: device.name,
  })
}

function navigateToDeviceChildView(payload: { child: CssMapDeviceChild, event: Event }) {
  payload.event.preventDefault()
  deviceNavigationPointerDown = null
  deviceNavigationLastTap = null
  requestDeviceViewNavigation(viewLevel.value, {
    targetType: 'device',
    deviceId: payload.child.id,
    deviceCode: payload.child.deviceCode,
    deviceName: payload.child.name,
  })
}

function isPrimaryPointer(event: PointerEvent) {
  return event.pointerType !== 'mouse' || event.button === 0
}

function handleDevicePointerDown(event: PointerEvent, device: CssMapDevice) {
  if (!isPrimaryPointer(event)) return
  event.preventDefault()
  deviceNavigationPointerDown = {
    key: getDeviceLayoutKey(device),
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  }
}

function handleDevicePointerCancel() {
  deviceNavigationPointerDown = null
}

function handleDevicePointerUp(event: PointerEvent, device: CssMapDevice) {
  if (!isPrimaryPointer(event)) return
  event.preventDefault()

  const key = getDeviceLayoutKey(device)
  const pointerDown = deviceNavigationPointerDown
  deviceNavigationPointerDown = null

  if (!pointerDown || pointerDown.pointerId !== event.pointerId || pointerDown.key !== key) return

  const moveDistance = Math.hypot(
    event.clientX - pointerDown.x,
    event.clientY - pointerDown.y,
  )
  if (moveDistance > DEVICE_NAVIGATION_MOVE_TOLERANCE) {
    deviceNavigationLastTap = null
    return
  }

  const lastTap = deviceNavigationLastTap
  const tapDistance = lastTap
    ? Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y)
    : Number.POSITIVE_INFINITY

  if (
    lastTap &&
    lastTap.key === key &&
    event.timeStamp - lastTap.time <= DEVICE_NAVIGATION_DOUBLE_TAP_MS &&
    tapDistance <= DEVICE_NAVIGATION_TAP_DISTANCE
  ) {
    navigateToDeviceView(device, event)
    return
  }

  deviceNavigationLastTap = {
    key,
    time: event.timeStamp,
    x: event.clientX,
    y: event.clientY,
  }
}

onMounted(async () => {
  try {
    const mapData = await loadCssMapData()
    cssMapDevices.value = mapData.devices
    cssMapSections.value = mapData.sections
    cssMapSize.value = mapData.size
  } catch (error) {
    console.error(error)
    return
  }

  await nextTick()

  if (!mapContainer.value || !cssMapSize.value || deviceElements.value.length === 0) return

  scene = createCss3dMapScene({
    container: mapContainer.value,
    devices: cssMapDevices.value.map((device, index) => ({
      device,
      element: deviceElements.value[index],
    })).filter((entry): entry is { device: CssMapDevice, element: HTMLElement } => (
      entry.element instanceof HTMLElement
    )),
    processBoundaries: cssMapSections.value,
    mapSize: cssMapSize.value,
    onDeviceScreenRectsChange: setDeviceScreenRects,
  })
})

onBeforeUnmount(() => {
  deviceNavigationPointerDown = null
  deviceNavigationLastTap = null
  scene?.dispose()
  scene = null
})
</script>

<template>
  <section class="css-map-panel">
    <div ref="mapContainer" class="css-map-panel__scene" aria-label="css3d device map" />

    <div class="css-map-panel__toolbar" data-css-map-control="true" :aria-label="t('cssMap.focus.toolbarAriaLabel')"
      role="group" @pointerdown.stop @wheel.stop>
      <label class="css-map-panel__filter"
        :class="{ 'css-map-panel__filter--active': activeSelectionMode === 'department' }">
        <span>{{ t('cssMap.focus.departmentLabel') }}</span>
        <el-select v-model="selectedDepartmentValue" class="css-map-panel__select"
          :aria-label="t('cssMap.focus.departmentLabel')" :options="departmentSelectOptions" size="large"
        />
      </label>

      <label class="css-map-panel__filter"
        :class="{ 'css-map-panel__filter--active': activeSelectionMode === 'process' }">
        <span>{{ t('cssMap.focus.processLabel') }}</span>
        <el-select v-model="selectedProcessValue" class="css-map-panel__select"
          :aria-label="t('cssMap.focus.processLabel')" :options="processSelectOptions" size="large"
          clearable @clear="selectProcess(null)" />
      </label>

      <button class="css-map-panel__settings" type="button" :title="t('threeMap.config.title')"
        @click.stop="settingsOpen = true">
        <el-icon :size="24">
          <Setting />
        </el-icon>
      </button>
    </div>

    <div class="css-map-panel__legend" data-css-map-control="true" :aria-label="t('cssMap.legend.ariaLabel')"
      @pointerdown.stop @wheel.stop>
      <table class="css-map-panel__legend-table">
        <thead>
          <tr>
            <th scope="col">
              {{ t('cssMap.legend.color') }}
            </th>
            <th scope="col">
              {{ t('threeMap.overlay.loadRate') }}
            </th>
            <th scope="col">
              {{ t('cssMap.legend.color') }}
            </th>
            <th scope="col">
              {{ t('cssMap.legend.workStatus') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(loadItem, index) in loadRateLegendItems" :key="loadItem.labelKey">
            <td>
              <span class="css-map-panel__legend-swatch" :style="{ background: loadItem.color }" />
            </td>
            <td>{{ t(loadItem.labelKey) }}</td>
            <td>
              <span v-if="statusLegendItems[index]" class="css-map-panel__legend-swatch"
                :style="{ background: statusLegendItems[index].color }" />
            </td>
            <td>
              <span v-if="statusLegendItems[index]">
                {{ t(`threeMap.overlay.status.${statusLegendItems[index].status}`) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="css-map-panel__legend-shifts">
        <span class="css-map-panel__legend-shifts-title">
          {{ t('cssMap.legend.staffingShift') }}
        </span>
        <div v-for="item in staffShiftLegendItems" :key="item.shift" class="css-map-panel__legend-shift-item">
          <CssMapStaffShiftPie :color="getCssMapStaffColor('operator')" :angle="getCssMapStaffShiftAngle(item.shift)"
            compact />
          <span>{{ t(item.shapeLabelKey) }}</span>
          <strong>{{ t(`threeMap.overlay.staffing.${item.shift}Shift`) }}</strong>
        </div>
      </div>
    </div>

    <div class="css-map-panel__source">
      <div v-for="device in cssMapDevices" :key="getDeviceLayoutKey(device)" ref="deviceElements"
        class="css-map-panel__device-host"
        @pointerdown.stop="(event: PointerEvent) => handleDevicePointerDown(event, device)"
        @pointerup.stop="(event: PointerEvent) => handleDevicePointerUp(event, device)"
        @pointercancel.stop="handleDevicePointerCancel"
        @dblclick.stop="(event: MouseEvent) => navigateToDeviceView(device, event)">
        <CssMapEquipmentNode
          :device="device"
          :display="displayOptions"
          :screen="getDeviceScreenRect(device)"
          @navigate-child="navigateToDeviceChildView"
        />
      </div>
    </div>

    <CssMapDisplaySettingsDialog :open="settingsOpen" :options="displayOptions" @close="settingsOpen = false"
      @update-options="setDisplayOptions" />
  </section>
</template>

<style>
.css-map-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(0deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px) 0 0 / 40px 40px,
    hsl(var(--card));
  color: hsl(var(--card-foreground));
}

.css-map-panel__scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.css-map-panel__scene:active {
  cursor: grabbing;
}

.css-map-panel__source {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  overflow: visible;
}

.css-map-panel__toolbar {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  display: flex;
  max-width: calc(100% - 36px);
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
}

.css-map-panel__filter {
  display: flex;
  height: 60px;
  min-width: 252px;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(20, 33, 61, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  padding: 0 12px 0 16px;
  color: #14213d;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px);
}

.css-map-panel__filter--active {
  border-color: rgba(22, 119, 255, 0.5);
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.12),
    0 0 0 2px rgba(22, 119, 255, 0.1);
}

.css-map-panel__filter>span {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
  white-space: nowrap;
}

.css-map-panel__select {
  width: 168px;
}

.css-map-panel__settings {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #14213d;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.css-map-panel__settings:hover {
  background: #ffffff;
}

.css-map-panel__legend {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 3;
  max-width: calc(100% - 28px);
  overflow: hidden;
  border: 1px solid rgba(20, 33, 61, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.93);
  color: #14213d;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}

.css-map-panel__legend-table {
  border-collapse: collapse;
  min-width: 360px;
  table-layout: fixed;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.css-map-panel__legend-table th,
.css-map-panel__legend-table td {
  height: 28px;
  border: 1px solid rgba(20, 33, 61, 0.16);
  padding: 3px 8px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.css-map-panel__legend-table th {
  background: rgba(241, 245, 249, 0.95);
  color: #14213d;
  font-size: 12px;
  font-weight: 900;
}

.css-map-panel__legend-table th:nth-child(1),
.css-map-panel__legend-table th:nth-child(3),
.css-map-panel__legend-table td:nth-child(1),
.css-map-panel__legend-table td:nth-child(3) {
  width: 54px;
  padding: 0;
}

.css-map-panel__legend-swatch {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 28px;
}

.css-map-panel__legend-shifts {
  display: grid;
  grid-template-columns: auto repeat(2, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid rgba(20, 33, 61, 0.16);
  font-size: 12px;
  font-weight: 800;
}

.css-map-panel__legend-shifts-title,
.css-map-panel__legend-shift-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  border-right: 1px solid rgba(20, 33, 61, 0.16);
  padding: 4px 8px;
  white-space: nowrap;
}

.css-map-panel__legend-shifts-title {
  background: rgba(241, 245, 249, 0.95);
  color: #14213d;
  font-weight: 900;
}

.css-map-panel__legend-shift-item:last-child {
  border-right: 0;
}

.css-map-panel__legend-shift-item span {
  color: #65758b;
}

.css-map-panel__legend-shift-item strong {
  color: #14213d;
  font-weight: 900;
}

.css-map-panel__device-host {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  cursor: pointer;
  touch-action: manipulation;
  transform-style: preserve-3d;
  user-select: none;
}

.css3d-map-renderer {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.css3d-map-plane {
  /* border: 1px solid rgba(22, 119, 255, 0.24); */
  /* border-radius: 8px; */
  /* background: rgba(241, 245, 249, 0.86); */
  /* box-shadow: */
  /* inset 0 0 0 1px rgba(255, 255, 255, 0.72), */
  /* 0 26px 60px rgba(15, 23, 42, 0.18); */
}

.css3d-map-process-boundaries,
.css3d-map-process-boundaries__svg,
.css3d-map-process-boundaries__polygon {
  pointer-events: none !important;
}

.css3d-map-process-boundaries {
  overflow: visible;
}

.css3d-map-process-boundaries__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.css3d-map-process-boundaries__polygon {
  stroke-width: 6px;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

@media (max-width: 900px) {
  .css-map-panel {
    min-height: 420px;
  }

  .css-map-panel__toolbar {
    left: 12px;
    right: 12px;
    flex-wrap: wrap;
  }

  .css-map-panel__filter {
    flex: 1 1 180px;
  }

  .css-map-panel__select {
    width: 100%;
  }

  .css-map-panel__legend {
    left: 12px;
    right: 12px;
    bottom: 12px;
    overflow-x: auto;
  }

  .css-map-panel__legend-table {
    min-width: 332px;
    font-size: 12px;
  }
}
</style>
