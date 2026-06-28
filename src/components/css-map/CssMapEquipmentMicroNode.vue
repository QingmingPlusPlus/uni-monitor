<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getCssMapLoadRateBackground,
  getCssMapTitleStyle,
} from './css3dMapPalette'
import type {
  CssMapDevice,
  CssMapDeviceScreenRect,
  CssMapDisplayOptions,
} from './css3dMapTypes'

const props = defineProps<{
  device: CssMapDevice
  display: CssMapDisplayOptions
  screen: CssMapDeviceScreenRect
}>()

const { t } = useI18n()

const width = computed(() => Math.max(props.screen.width, 1))
const height = computed(() => Math.max(props.screen.height, 1))
const ratio = computed(() => width.value / height.value)
const microShape = computed(() => {
  if (ratio.value <= 0.72) return 'vertical'
  if (ratio.value >= 1.55) return 'horizontal'
  return 'block'
})
const isUltraTiny = computed(() => width.value < 8 || height.value < 8)
const titleStyle = computed(() => getCssMapTitleStyle(
  props.device.runtime.status,
  props.display.showStatusColor,
))
const loadRateLabel = computed(() => (
  props.device.runtime.loadRate === null ? '--' : `${props.device.runtime.loadRate}%`
))
const statusLabel = computed(() => (
  props.device.runtime.status ? t(`threeMap.overlay.status.${props.device.runtime.status}`) : '--'
))
const surfaceStyle = computed(() => {
  const scale = Math.max(props.screen.scale, 0.001)
  const shortest = Math.min(width.value, height.value)
  const fontSize = Math.max(5, Math.min(13, shortest * 0.18, width.value * 0.16))
  const loadFontSize = Math.max(6, Math.min(15, shortest * 0.2, width.value * 0.18))

  return {
    width: `${width.value}px`,
    height: `${height.value}px`,
    transform: `scale(${1 / scale})`,
    background: getCssMapLoadRateBackground(
      props.device.runtime.loadRate,
      props.display.showLoadRateColor,
    ),
    '--css-map-micro-title-background': titleStyle.value.background,
    '--css-map-micro-title-color': titleStyle.value.color,
    '--css-map-micro-font-size': `${fontSize}px`,
    '--css-map-micro-load-font-size': `${loadFontSize}px`,
    '--css-map-micro-padding': `${Math.max(1, Math.min(5, shortest * 0.06))}px`,
  }
})
</script>

<template>
  <article
    class="css-map-equipment-micro"
    :class="[
      `css-map-equipment-micro--${microShape}`,
      { 'css-map-equipment-micro--ultra-tiny': isUltraTiny },
    ]"
    :style="surfaceStyle"
    :data-device-id="device.id"
    data-display-mode="micro"
    :title="`${device.name} / ${statusLabel} / ${loadRateLabel}`"
  >
    <strong class="css-map-equipment-micro__name">{{ device.name }}</strong>
    <span class="css-map-equipment-micro__load">{{ loadRateLabel }}</span>
  </article>
</template>

<style scoped>
.css-map-equipment-micro {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  min-width: 1px;
  min-height: 1px;
  overflow: hidden;
  border: 1px solid rgba(20, 33, 61, 0.18);
  border-radius: 4px;
  box-sizing: border-box;
  color: #14213d;
  font-size: var(--css-map-micro-font-size);
  font-weight: 900;
  line-height: 1.02;
  transform-origin: top left;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.css-map-equipment-micro *,
.css-map-equipment-micro *::before,
.css-map-equipment-micro *::after {
  box-sizing: border-box;
}

.css-map-equipment-micro__name,
.css-map-equipment-micro__load {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.css-map-equipment-micro__name {
  color: var(--css-map-micro-title-color);
}

.css-map-equipment-micro__load {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.1em 0.28em;
  font-size: var(--css-map-micro-load-font-size);
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}

.css-map-equipment-micro--horizontal {
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.28em;
  padding: var(--css-map-micro-padding);
}

.css-map-equipment-micro--horizontal .css-map-equipment-micro__name {
  align-self: stretch;
  border-radius: 3px;
  background: var(--css-map-micro-title-background);
  padding: 0.16em 0.3em;
  line-height: 1.08;
  white-space: nowrap;
}

.css-map-equipment-micro--block {
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 0.18em;
  padding: var(--css-map-micro-padding);
}

.css-map-equipment-micro--block .css-map-equipment-micro__name {
  border-radius: 3px;
  background: var(--css-map-micro-title-background);
  padding: 0.16em 0.28em;
  line-height: 1.08;
  overflow-wrap: anywhere;
}

.css-map-equipment-micro--vertical {
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: center;
  gap: 0.16em;
  padding: var(--css-map-micro-padding);
}

.css-map-equipment-micro--vertical .css-map-equipment-micro__name {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background: var(--css-map-micro-title-background);
  padding: 0.22em 0.08em;
  text-align: center;
  text-overflow: clip;
  writing-mode: vertical-rl;
}

.css-map-equipment-micro--vertical .css-map-equipment-micro__load {
  max-width: 100%;
  padding: 0.1em 0.12em;
  font-size: max(5px, calc(var(--css-map-micro-load-font-size) * 0.82));
}

.css-map-equipment-micro--ultra-tiny .css-map-equipment-micro__name,
.css-map-equipment-micro--ultra-tiny .css-map-equipment-micro__load {
  display: none;
}
</style>
