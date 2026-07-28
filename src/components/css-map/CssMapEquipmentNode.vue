<script setup lang="ts">
import { computed } from 'vue'
import CssMapFiveMMarker from './CssMapFiveMMarker.vue'
import CssMapStaffMarker from './CssMapStaffMarker.vue'
import {
  getCssMapLoadRateBackground,
  getCssMapTitleStyle,
} from './css3dMapPalette'
import {
  planCssMapDeviceContent,
  planCssMapMarkerSlots,
} from './cssMapDeviceContentLayout'
import {
  getCssMapDeviceClipPath,
  getCssMapRightLShapeMetrics,
  getCssMapDeviceSvgPolygonPoints,
} from './cssMapDeviceShape'
import type {
  CssMapDevice,
  CssMapDeviceChild,
  CssMapDeviceScreenRect,
  CssMapDeviceStatus,
  CssMapDisplayOptions,
} from './css3dMapTypes'

const statusLabels: Readonly<Record<CssMapDeviceStatus, string>> = {
  production: '生产中',
  abnormalStop: '异常停止',
  plannedStop: '计划停止',
  changeover: '切替',
  cleaning: '清扫',
  neutral: '待确认',
}

const props = defineProps<{
  readonly device: CssMapDevice
  readonly display: CssMapDisplayOptions
  readonly screen: CssMapDeviceScreenRect
  readonly selectMode: boolean
}>()

defineEmits<{
  openChild: [child: CssMapDeviceChild]
}>()

const statusLabel = computed(() => (
  props.device.runtime.status === null ? '待确认' : statusLabels[props.device.runtime.status]
))

const loadRateLabel = computed(() => (
  props.device.runtime.loadRate === null ? '--' : `${props.device.runtime.loadRate.toFixed(1)}%`
))

const statusStyle = computed(() => getCssMapTitleStyle(
  props.device.runtime.status,
  props.display.showStatusColor,
))

const loadRateStyle = computed(() => ({
  '--css-map-node-load-background': getCssMapLoadRateBackground(
    props.device.runtime.loadRate,
    props.display.showLoadRateColor,
  ),
}))

const staffingItems = computed(() => (
  props.display.showStaffing ? props.device.runtime.staff : []
))

const fiveMItems = computed(() => (
  props.display.showFiveMChanges ? props.device.runtime.fiveMChanges : []
))

const hasStaffing = computed(() => staffingItems.value.length > 0)

const hasFiveMChanges = computed(() => fiveMItems.value.length > 0)

const equipmentBorderWidth = 4

const contentPlan = computed(() => planCssMapDeviceContent({
  worldWidth: props.device.w,
  worldHeight: props.device.h,
  surfaceWidth: Math.max(1, props.screen.width - equipmentBorderWidth * 2),
  surfaceHeight: Math.max(1, props.screen.height - equipmentBorderWidth * 2),
  name: props.device.name,
  statusLabel: statusLabel.value,
  loadRateLabel: loadRateLabel.value,
  staffCount: staffingItems.value.length,
  fiveMCount: fiveMItems.value.length,
  showStaffing: props.display.showStaffing,
  showFiveMChanges: props.display.showFiveMChanges,
}))

const staffSlotPlan = computed(() => planCssMapMarkerSlots(
  staffingItems.value.length,
  contentPlan.value.orientation,
))

const fiveMSlotPlan = computed(() => planCssMapMarkerSlots(
  fiveMItems.value.length,
  contentPlan.value.orientation,
))

const visibleStaffingItems = computed(() => staffingItems.value.slice(
  0,
  staffSlotPlan.value.visibleMarkerCount,
))

const visibleFiveMItems = computed(() => fiveMItems.value.slice(
  0,
  fiveMSlotPlan.value.visibleMarkerCount,
))

const compactNameHeaderWidth = 160
const useCompactNameHeader = computed(() => (
  contentPlan.value.contentWidth < compactNameHeaderWidth
))

const detailTitle = computed(() => {
  const staffing = hasStaffing.value
    ? `人员配置 ${props.device.runtime.staff.length}人`
    : '无人员配置'
  const fiveM = hasFiveMChanges.value
    ? `5M变化点 ${props.device.runtime.fiveMChanges.length}项`
    : '无5M变化点'

  return `${props.device.name} / ${statusLabel.value} / 负荷率 ${loadRateLabel.value} / ${staffing} / ${fiveM}`
})

const polygonClipPath = computed(() => getCssMapDeviceClipPath(props.device))

const polygonPoints = computed(() => getCssMapDeviceSvgPolygonPoints(props.device))

const rightLShapeMetrics = computed(() => (
  props.device.contentLayout === 'right-l-shape'
    ? getCssMapRightLShapeMetrics(props.device)
    : undefined
))

const usesRightLShapeContent = computed(() => Boolean(rightLShapeMetrics.value))

const surfaceStyle = computed(() => {
  const scale = Math.max(props.screen.scale, 0.001)
  const width = Math.max(props.screen.width, 1)
  const height = Math.max(props.screen.height, 1)
  const smallSide = Math.min(width, height)
  const status = statusStyle.value
  const rightLShape = rightLShapeMetrics.value
  const rightLBarHeight = rightLShape?.barHeightRatio ?? 1
  const rightLHeaderHeight = rightLBarHeight * 0.55

  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${1 / scale})`,
    clipPath: polygonClipPath.value,
    '--css-map-node-font-size': `${Math.max(10, Math.min(20, smallSide * 0.16))}px`,
    '--css-map-node-load-size': `${Math.max(9, Math.min(15, smallSide * 0.11))}px`,
    '--css-map-node-status-background': status.background,
    '--css-map-node-status-border': status.border,
    '--css-map-node-status-color': status.color,
    '--css-map-node-border-width': `${equipmentBorderWidth}px`,
    '--css-map-staff-marker-size': `${Math.max(9, Math.min(18, smallSide * 0.16))}px`,
    '--css-map-five-m-marker-size': `${Math.max(9, Math.min(18, smallSide * 0.16))}px`,
    '--css-map-node-content-width': usesRightLShapeContent.value
      ? '100%'
      : `${contentPlan.value.contentWidthRatio * 100}%`,
    '--css-map-right-l-leg-start': `${(rightLShape?.legStartRatio ?? 1) * 100}%`,
    '--css-map-right-l-bar-height': `${rightLBarHeight * 100}%`,
    '--css-map-right-l-header-height': `${rightLHeaderHeight * 100}%`,
  }
})
</script>

<template>
  <article
    class="css-map-equipment-node"
    :class="{
      'css-map-equipment-node--selecting': selectMode,
      'css-map-equipment-node--compact-name': useCompactNameHeader,
      'css-map-equipment-node--vertical': contentPlan.orientation === 'vertical',
      'css-map-equipment-node--horizontal': contentPlan.orientation === 'horizontal',
      'css-map-equipment-node--wide': contentPlan.isWide,
      'css-map-equipment-node--polygon': Boolean(polygonPoints),
      'css-map-equipment-node--right-l-shape': usesRightLShapeContent,
    }"
    :style="surfaceStyle"
    :data-device-id="device.id"
    :title="detailTitle"
  >
    <div class="css-map-equipment-node__content">
      <header class="css-map-equipment-node__header">
        <strong>{{ device.name }}</strong>
        <span class="css-map-equipment-node__status">{{ statusLabel }}</span>
      </header>

      <section class="css-map-equipment-node__body">
        <div
          class="css-map-equipment-node__rate"
          :style="loadRateStyle"
        >
          <span class="css-map-equipment-node__rate-label">负荷率</span>
          <strong>{{ loadRateLabel }}</strong>
        </div>

        <div class="css-map-equipment-node__details">
          <div class="css-map-equipment-node__detail-row">
            <span class="css-map-equipment-node__detail-label">人员</span>
            <div class="css-map-equipment-node__markers">
              <CssMapStaffMarker
                v-for="staff in visibleStaffingItems"
                :key="staff.id"
                :staff="staff"
              />
              <span
                v-if="staffSlotPlan.overflowCount > 0"
                class="css-map-equipment-node__overflow"
              >
                +{{ staffSlotPlan.overflowCount }}
              </span>
              <span
                v-if="!hasStaffing"
                class="css-map-equipment-node__empty"
              >
                --
              </span>
            </div>
          </div>

          <div class="css-map-equipment-node__detail-row">
            <span class="css-map-equipment-node__detail-label">5M</span>
            <div class="css-map-equipment-node__markers">
              <CssMapFiveMMarker
                v-for="change in visibleFiveMItems"
                :key="change.id"
                :change="change"
              />
              <span
                v-if="fiveMSlotPlan.overflowCount > 0"
                class="css-map-equipment-node__overflow"
              >
                +{{ fiveMSlotPlan.overflowCount }}
              </span>
              <span
                v-if="!hasFiveMChanges"
                class="css-map-equipment-node__empty"
              >
                --
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <svg
      v-if="polygonPoints"
      class="css-map-equipment-node__shape"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon
        class="css-map-equipment-node__shape-border"
        :points="polygonPoints"
      />
      <polygon
        v-if="selectMode"
        class="css-map-equipment-node__shape-selection"
        :points="polygonPoints"
      />
    </svg>
  </article>
</template>

<style src="./CssMapEquipmentNode.css"></style>
