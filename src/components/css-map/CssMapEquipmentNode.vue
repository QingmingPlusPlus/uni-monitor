<script setup lang="ts">
import { computed } from 'vue'
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

const emit = defineEmits<{
  openChild: [child: CssMapDeviceChild]
}>()

const statusLabel = computed(() => (
  props.device.runtime.status === null ? '待确认' : statusLabels[props.device.runtime.status]
))

const loadRateLabel = computed(() => (
  props.device.runtime.loadRate === null ? '--' : `${props.device.runtime.loadRate}%`
))

const titleStyle = computed(() => getCssMapTitleStyle(
  props.device.runtime.status,
  props.display.showStatusColor,
))

const bodyStyle = computed(() => ({
  background: getCssMapLoadRateBackground(
    props.device.runtime.loadRate,
    props.display.showLoadRateColor,
  ),
}))

const surfaceStyle = computed(() => {
  const scale = Math.max(props.screen.scale, 0.001)
  const width = Math.max(props.screen.width, 1)
  const height = Math.max(props.screen.height, 1)
  const smallSide = Math.min(width, height)

  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${1 / scale})`,
    '--css-map-node-font-size': `${Math.max(9, Math.min(18, smallSide * 0.13))}px`,
    '--css-map-node-load-size': `${Math.max(13, Math.min(30, smallSide * 0.18))}px`,
  }
})

function getChildStyle(child: CssMapDeviceChild) {
  const childTitleStyle = getCssMapTitleStyle(child.runtime.status, props.display.showStatusColor)

  return {
    left: `${child.x}%`,
    top: `${child.y}%`,
    width: `${child.w}%`,
    height: `${child.h}%`,
    background: getCssMapLoadRateBackground(child.runtime.loadRate, props.display.showLoadRateColor),
    '--css-map-child-title-background': childTitleStyle.background,
    '--css-map-child-title-color': childTitleStyle.color,
  }
}

function getChildTitle(child: CssMapDeviceChild): string {
  const status = child.runtime.status === null ? '待确认' : statusLabels[child.runtime.status]
  const loadRate = child.runtime.loadRate === null ? '--' : `${child.runtime.loadRate}%`

  return `${child.name} / ${status} / ${loadRate}`
}

function openChild(child: CssMapDeviceChild): void {
  emit('openChild', child)
}
</script>

<template>
  <article
    class="css-map-equipment-node"
    :class="{ 'css-map-equipment-node--selecting': selectMode }"
    :style="surfaceStyle"
    :data-device-id="device.id"
    :title="`${device.name} / ${statusLabel} / ${loadRateLabel}`"
  >
    <header
      class="css-map-equipment-node__header"
      :style="{ background: titleStyle.background, color: titleStyle.color }"
    >
      <strong>{{ device.name }}</strong>
      <span>{{ statusLabel }}</span>
    </header>

    <section
      class="css-map-equipment-node__body"
      :style="bodyStyle"
    >
      <span class="css-map-equipment-node__caption">负荷率</span>
      <strong class="css-map-equipment-node__load">{{ loadRateLabel }}</strong>
      <span
        v-if="device.runtime.staff.length > 0"
        class="css-map-equipment-node__meta"
      >
        {{ device.runtime.staff.length }} 人配置
      </span>
    </section>

    <div
      v-if="device.children.length > 0"
      class="css-map-equipment-node__children"
      aria-label="设备组子设备"
    >
      <button
        v-for="child in device.children"
        :key="child.id"
        class="css-map-equipment-node__child"
        type="button"
        :style="getChildStyle(child)"
        :title="getChildTitle(child)"
        @click.stop="selectMode ? openChild(child) : undefined"
        @dblclick.stop="openChild(child)"
      >
        <span>{{ child.name }}</span>
      </button>
    </div>
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
  grid-template-rows: minmax(22px, 28%) minmax(0, 1fr);
  border: 1px solid rgba(21, 43, 70, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 28px rgba(22, 48, 82, 0.14);
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
  gap: 4px;
  padding: 4px 8px;
  font-weight: 800;
}

.css-map-equipment-node__header strong,
.css-map-equipment-node__header span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__body {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px;
}

.css-map-equipment-node__caption,
.css-map-equipment-node__meta {
  font-size: max(9px, calc(var(--css-map-node-font-size) * 0.76));
  font-weight: 700;
  opacity: 0.76;
}

.css-map-equipment-node__load {
  font-size: var(--css-map-node-load-size);
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  line-height: 1;
}

.css-map-equipment-node__children {
  position: absolute;
  inset: 6px;
}

.css-map-equipment-node__child {
  position: absolute;
  overflow: hidden;
  border: 1px solid rgba(21, 43, 70, 0.18);
  border-radius: 4px;
  color: var(--um-color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: max(7px, calc(var(--css-map-node-font-size) * 0.72));
  font-weight: 800;
  line-height: 1.1;
}

.css-map-equipment-node__child span {
  display: block;
  overflow: hidden;
  border-radius: 3px;
  background: var(--css-map-child-title-background);
  color: var(--css-map-child-title-color);
  padding: 2px 3px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
