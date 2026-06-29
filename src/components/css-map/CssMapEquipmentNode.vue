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
  props.device.runtime.loadRate === null ? '--' : `${Math.round(props.device.runtime.loadRate)}%`
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

const detailTitle = computed(() => {
  const staffing = hasStaffing.value
    ? `人员配置 ${props.device.runtime.staff.length}人`
    : '无人员配置'
  const fiveM = hasFiveMChanges.value
    ? `5M变化点 ${props.device.runtime.fiveMChanges.length}项`
    : '无5M变化点'

  return `${props.device.name} / ${statusLabel.value} / 符合率 ${loadRateLabel.value} / ${staffing} / ${fiveM}`
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
    '--css-map-node-font-size': `${Math.max(9, Math.min(18, smallSide * 0.13))}px`,
    '--css-map-node-load-size': `${Math.max(11, Math.min(24, smallSide * 0.2))}px`,
    '--css-map-node-status-background': status.background,
    '--css-map-node-status-color': status.color,
    '--css-map-staff-marker-size': `${Math.max(9, Math.min(18, smallSide * 0.16))}px`,
    '--css-map-five-m-marker-size': `${Math.max(9, Math.min(18, smallSide * 0.16))}px`,
  }
})
</script>

<template>
  <article
    class="css-map-equipment-node"
    :class="{ 'css-map-equipment-node--selecting': selectMode }"
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

<style scoped>
.css-map-equipment-node {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  overflow: hidden;
  min-width: 1px;
  min-height: 1px;
  grid-template-rows: minmax(24px, 30%) minmax(0, 1fr);
  border: 2px solid var(--css-map-node-status-background);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 0 0 1px var(--css-map-node-status-background),
    0 12px 28px rgba(22, 48, 82, 0.14);
  box-sizing: border-box;
  color: var(--um-color-text-primary);
  font-size: var(--css-map-node-font-size);
  line-height: 1.2;
  transform-origin: top left;
}

.css-map-equipment-node--selecting {
  outline: 3px solid rgba(36, 113, 255, 0.36);
  outline-offset: 2px;
}

.css-map-equipment-node__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border-bottom: 1px solid rgba(21, 43, 70, 0.12);
  background: rgba(255, 255, 255, 0.96);
  padding: 3px 6px;
  font-weight: 900;
}

.css-map-equipment-node__header strong {
  overflow: hidden;
  min-width: 0;
  color: #14213d;
  font-size: max(10px, calc(var(--css-map-node-font-size) * 1.02));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__status {
  display: inline-grid;
  overflow: hidden;
  max-width: 46%;
  min-width: 0;
  place-items: center;
  border: 1px solid rgba(21, 43, 70, 0.16);
  border-radius: 999px;
  background: var(--css-map-node-status-background);
  color: var(--css-map-node-status-color);
  font-size: max(9px, calc(var(--css-map-node-font-size) * 0.78));
  font-weight: 900;
  line-height: 1;
  padding: 3px 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__body {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(24px, 31%) minmax(0, 1fr);
}

.css-map-equipment-node__rate {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  border-right: 1px solid rgba(21, 43, 70, 0.12);
  color: #14213d;
  padding: 2px;
  text-align: center;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.css-map-equipment-node__rate strong {
  display: block;
  overflow: hidden;
  max-width: 100%;
  font-size: var(--css-map-node-load-size);
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  line-height: 1;
  text-overflow: clip;
  white-space: nowrap;
}

.css-map-equipment-node__details {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2px;
  padding: 3px 4px;
}

.css-map-equipment-node__detail-row {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  align-items: center;
  gap: 3px;
}

.css-map-equipment-node__detail-label {
  flex: 0 0 auto;
  color: rgba(20, 33, 61, 0.72);
  font-size: max(8px, calc(var(--css-map-node-font-size) * 0.66));
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.css-map-equipment-node__markers {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  gap: 3px;
}

.css-map-equipment-node__empty {
  color: rgba(20, 33, 61, 0.38);
  font-size: max(8px, calc(var(--css-map-node-font-size) * 0.7));
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}
</style>
