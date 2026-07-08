<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CssMapLegend from './CssMapLegend.vue'
import CssMapScreenControls from './CssMapScreenControls.vue'
import CssMapToolbar from './CssMapToolbar.vue'
import { getCssMapProcessBoundaryFocusRect, getCssMapProcessBoundaryGroupFocusRect } from './css3dMapProcessBoundaries'
import { loadCssMapData } from './css3dMapLiveData'
import { runCssMapScreenAction } from './css3dMapScreenActions'
import { createSpriteCssMapScene, type SpriteCssMapScene } from './spriteCssMapScene'
import type {
  CssMapDepartmentValue,
  CssMapDevice,
  CssMapDisplayOptions,
  CssMapProcessBoundary,
  CssMapProcessValue,
  CssMapScreenControlAction,
  CssMapSelectionConfig,
  CssMapSize,
} from './css3dMapTypes'

defineOptions({
  name: 'SpriteCssMapPanel',
})

const props = defineProps<{
  readonly selectionConfig: CssMapSelectionConfig
  readonly selectedDepartment: CssMapDepartmentValue
  readonly selectedProcess: CssMapProcessValue | null
}>()

const emit = defineEmits<{
  selectDepartment: [value: CssMapDepartmentValue]
  selectProcess: [value: CssMapProcessValue]
  clearProcess: []
  openDevice: [payload: { readonly deviceId: string }]
  fallback: [reason: string]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const cssMapDevices = ref<readonly CssMapDevice[]>([])
const cssMapSections = ref<readonly CssMapProcessBoundary[]>([])
const cssMapSize = ref<CssMapSize | null>(null)
const loadError = ref('')
const isLoading = ref(true)
const selectMode = ref(false)
const displayOptions: CssMapDisplayOptions = {
  showStatusColor: true,
  showLoadRateColor: true,
  showStaffing: true,
  showFiveMChanges: true,
}

let scene: SpriteCssMapScene | null = null

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
  emit('openDevice', { deviceId })
}

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
  isLoading.value = true
  const mapData = await loadCssMapData(props.selectionConfig)

  cssMapDevices.value = mapData.devices
  cssMapSections.value = mapData.sections
  cssMapSize.value = mapData.size

  await nextTick()

  if (!mapContainer.value || !cssMapSize.value) return

  try {
    scene = createSpriteCssMapScene({
      container: mapContainer.value,
      devices: cssMapDevices.value,
      processBoundaries: cssMapSections.value,
      mapSize: cssMapSize.value,
      display: displayOptions,
      isSelectMode: () => selectMode.value,
      openDevice,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sprite 地图初始化失败'
    isLoading.value = false
    emit('fallback', message)
    return
  }

  focusActiveSelection()
  isLoading.value = false
}

onMounted(() => {
  initializeScene().catch((error: unknown) => {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '地图加载失败'
  })
})

onBeforeUnmount(() => {
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

watch(selectMode, (value) => {
  scene?.setSelectMode(value)
})
</script>

<template>
  <section class="css-map-panel sprite-css-map-panel">
    <div
      ref="mapContainer"
      class="css-map-panel__scene sprite-css-map-panel__scene"
      aria-label="工厂 Sprite 地图"
    />

    <CssMapToolbar
      :selection-config="selectionConfig"
      :selected-department="selectedDepartment"
      :selected-process="selectedProcess"
      @select-department="emit('selectDepartment', $event)"
      @select-process="emit('selectProcess', $event)"
      @clear-process="emit('clearProcess')"
    />

    <CssMapLegend />

    <CssMapScreenControls
      :select-mode="selectMode"
      @action="handleScreenControl"
    />

    <div
      v-if="isLoading && !loadError"
      class="css-map-panel__loading"
    >
      地图加载中...
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
