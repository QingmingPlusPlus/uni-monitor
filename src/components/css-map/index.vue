<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import CssMapEquipmentNode from './CssMapEquipmentNode.vue'
import CssMapLegend from './CssMapLegend.vue'
import CssMapScreenControls from './CssMapScreenControls.vue'
import CssMapToolbar from './CssMapToolbar.vue'
import { createCss3dMapScene, type Css3dMapScene } from './css3dMapScene'
import { getCssMapProcessBoundaryFocusRect, getCssMapProcessBoundaryGroupFocusRect } from './css3dMapProcessBoundaries'
import { loadCssMapData } from './css3dMapLiveData'
import { runCssMapScreenAction } from './css3dMapScreenActions'
import {
  createCssMapDeviceNavigation,
  getCssMapDeviceLayoutKey,
} from './css3dMapDeviceNavigation'
import type {
  CssMapDepartmentValue,
  CssMapDevice,
  CssMapDeviceChild,
  CssMapDeviceScreenRect,
  CssMapDisplayOptions,
  CssMapSelectionConfig,
  CssMapProcessBoundary,
  CssMapProcessValue,
  CssMapScreenControlAction,
  CssMapSize,
} from './css3dMapTypes'

defineOptions({
  name: 'CssMapPanel',
})

const props = defineProps<{
  readonly selectionConfig: CssMapSelectionConfig
  readonly selectedDepartment: CssMapDepartmentValue
  readonly selectedProcess: CssMapProcessValue | null
}>()

const emit = defineEmits<{
  selectDepartment: [value: CssMapDepartmentValue]
  selectProcess: [value: CssMapProcessValue]
  openDevice: [payload: { readonly deviceId: string }]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const deviceElements = ref<HTMLElement[]>([])
const cssMapDevices = ref<readonly CssMapDevice[]>([])
const cssMapSections = ref<readonly CssMapProcessBoundary[]>([])
const cssMapSize = ref<CssMapSize | null>(null)
const loadError = ref('')
const selectMode = ref(false)
const deviceScreenRects = reactive<Record<string, CssMapDeviceScreenRect>>({})
const displayOptions: CssMapDisplayOptions = {
  showStatusColor: true,
  showLoadRateColor: true,
  showStaffing: true,
  showFiveMChanges: true,
}

let scene: Css3dMapScene | null = null

function setDeviceScreenRects(rects: Record<string, CssMapDeviceScreenRect>): void {
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
  return deviceScreenRects[getCssMapDeviceLayoutKey(device)] ?? {
    width: device.w,
    height: device.h,
    scale: 1,
  }
}

function focusProcessBoundary(value: CssMapProcessValue): void {
  const rect = getCssMapProcessBoundaryFocusRect([...cssMapSections.value], value)
  if (!rect) return
  scene?.focusRect(rect)
}

function focusDepartmentBoundary(value: CssMapDepartmentValue): void {
  const rect = getCssMapProcessBoundaryGroupFocusRect(
    [...cssMapSections.value],
    props.selectionConfig.departmentProcessMap[value],
  )
  if (!rect) return
  scene?.focusRect(rect)
}

function focusActiveSelection(): void {
  if (props.selectedProcess) {
    focusProcessBoundary(props.selectedProcess)
    return
  }

  focusDepartmentBoundary(props.selectedDepartment)
}

function openDevice(deviceId: string): void {
  selectMode.value = false
  deviceNavigation.reset()
  emit('openDevice', { deviceId })
}

function openDeviceChild(child: CssMapDeviceChild): void {
  openDevice(child.id)
}

const deviceNavigation = createCssMapDeviceNavigation({
  isSelectMode: () => selectMode.value,
  openDevice,
})

function handleScreenControl(action: CssMapScreenControlAction): void {
  runCssMapScreenAction(action, {
    scene,
    focusActiveSelection,
    toggleSelectMode: () => {
      selectMode.value = !selectMode.value
    },
  })
}

async function initializeScene(): Promise<void> {
  const mapData = await loadCssMapData(props.selectionConfig)

  cssMapDevices.value = mapData.devices
  cssMapSections.value = mapData.sections
  cssMapSize.value = mapData.size

  await nextTick()

  if (!mapContainer.value || !cssMapSize.value || deviceElements.value.length === 0) return

  scene = createCss3dMapScene({
    container: mapContainer.value,
    devices: cssMapDevices.value.map((device, index) => ({
      device,
      element: deviceElements.value[index],
    })).filter((entry): entry is { readonly device: CssMapDevice; readonly element: HTMLElement } => (
      entry.element instanceof HTMLElement
    )),
    processBoundaries: [...cssMapSections.value],
    mapSize: cssMapSize.value,
    onDeviceScreenRectsChange: setDeviceScreenRects,
  })

  focusActiveSelection()
}

onMounted(() => {
  initializeScene().catch((error: unknown) => {
    loadError.value = error instanceof Error ? error.message : '地图加载失败'
  })
})

onBeforeUnmount(() => {
  deviceNavigation.reset()
  scene?.dispose()
  scene = null
})

watch(
  () => [props.selectedDepartment, props.selectedProcess, props.selectionConfig, cssMapSections.value.length] as const,
  () => {
    nextTick(focusActiveSelection).catch((error: unknown) => {
      loadError.value = error instanceof Error ? error.message : '地图聚焦失败'
    })
  },
)
</script>

<template>
  <section class="css-map-panel">
    <div
      ref="mapContainer"
      class="css-map-panel__scene"
      aria-label="工厂 CSS 地图"
    />

    <CssMapToolbar
      :selection-config="selectionConfig"
      :selected-department="selectedDepartment"
      :selected-process="selectedProcess"
      @select-department="emit('selectDepartment', $event)"
      @select-process="emit('selectProcess', $event)"
    />

    <CssMapLegend />

    <CssMapScreenControls
      :select-mode="selectMode"
      @action="handleScreenControl"
    />

    <div class="css-map-panel__source">
      <div
        v-for="device in cssMapDevices"
        :key="getCssMapDeviceLayoutKey(device)"
        ref="deviceElements"
        class="css-map-panel__device-host"
        @pointerdown.stop="(event: PointerEvent) => deviceNavigation.handlePointerDown(event, device)"
        @pointerup.stop="(event: PointerEvent) => deviceNavigation.handlePointerUp(event, device)"
        @pointercancel.stop="deviceNavigation.handlePointerCancel"
        @dblclick.stop="openDevice(device.id)"
      >
        <CssMapEquipmentNode
          :device="device"
          :display="displayOptions"
          :screen="getDeviceScreenRect(device)"
          :select-mode="selectMode"
          @open-child="openDeviceChild"
        />
      </div>
    </div>

    <div
      v-if="loadError"
      class="css-map-panel__error"
    >
      {{ loadError }}
    </div>
  </section>
</template>

<style src="./CssMapPanel.css"></style>
