<script setup lang="ts">
import { computed } from 'vue'
import CssMapFiveMMarker from './CssMapFiveMMarker.vue'
import CssMapStaffMarker from './CssMapStaffMarker.vue'
import {
  getCssMapLoadRateBackground,
  getCssMapTitleStyle,
} from './css3dMapPalette'
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
  background: getCssMapLoadRateBackground(
    props.device.runtime.loadRate,
    props.display.showLoadRateColor,
  ),
}))

const hasStaffing = computed(() => props.device.runtime.staff.length > 0)

const hasFiveMChanges = computed(() => props.device.runtime.fiveMChanges.length > 0)

const compactNameHeaderWidth = 160
const useCompactNameHeader = computed(() => props.screen.width < compactNameHeaderWidth)

const detailTitle = computed(() => {
  const staffing = hasStaffing.value
    ? `人员配置 ${props.device.runtime.staff.length}人`
    : '无人员配置'
  const fiveM = hasFiveMChanges.value
    ? `5M变化点 ${props.device.runtime.fiveMChanges.length}项`
    : '无5M变化点'

  return `${props.device.name} / ${statusLabel.value} / 负荷率 ${loadRateLabel.value} / ${staffing} / ${fiveM}`
})

const surfaceStyle = computed(() => {
  const scale = Math.max(props.screen.scale, 0.001)
  const width = Math.max(props.screen.width, 1)
  const height = Math.max(props.screen.height, 1)
  const smallSide = Math.min(width, height)
  const status = statusStyle.value

  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${1 / scale})`,
    '--css-map-node-font-size': `${Math.max(10, Math.min(20, smallSide * 0.16))}px`,
    '--css-map-node-load-size': `${Math.max(9, Math.min(15, smallSide * 0.11))}px`,
    '--css-map-node-status-background': status.background,
    '--css-map-node-status-border': status.border,
    '--css-map-node-status-color': status.color,
    '--css-map-staff-marker-size': `${Math.max(9, Math.min(18, smallSide * 0.16))}px`,
    '--css-map-five-m-marker-size': `${Math.max(9, Math.min(18, smallSide * 0.16))}px`,
  }
})
</script>

<template>
  <article
    class="css-map-equipment-node"
    :class="{
      'css-map-equipment-node--selecting': selectMode,
      'css-map-equipment-node--compact-name': useCompactNameHeader,
    }"
    :style="surfaceStyle"
    :data-device-id="device.id"
    :title="detailTitle"
  >
    <header class="css-map-equipment-node__header">
      <strong>{{ device.name }}</strong>
      <span class="css-map-equipment-node__status">{{ statusLabel }}</span>
    </header>

    <section class="css-map-equipment-node__body">
      <div
        class="css-map-equipment-node__rate"
        :style="loadRateStyle"
      >
        <strong>{{ loadRateLabel }}</strong>
      </div>

      <div class="css-map-equipment-node__details">
        <div class="css-map-equipment-node__detail-row">
          <span class="css-map-equipment-node__detail-label">配置</span>
          <div class="css-map-equipment-node__markers">
            <CssMapStaffMarker
              v-for="staff in device.runtime.staff"
              :key="staff.id"
              :staff="staff"
            />
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
              v-for="change in device.runtime.fiveMChanges"
              :key="change.id"
              :change="change"
            />
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
  </article>
</template>

<style src="./CssMapEquipmentNode.css"></style>
