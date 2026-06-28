<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CssMapFiveMBadge from './CssMapFiveMBadge.vue'
import CssMapStaffShiftPie from './CssMapStaffShiftPie.vue'
import { planCssMapDeviceNode } from './css3dMapLayout'
import {
  getCssMapFiveMGlyph,
  getCssMapLoadRateBackground,
  getCssMapStaffColor,
  getCssMapStaffShiftAngle,
  getCssMapTitleStyle,
} from './css3dMapPalette'
import type {
  CssMapDevice,
  CssMapDeviceScreenRect,
  CssMapDisplayOptions,
  CssMapFiveMCategory,
} from './css3dMapTypes'

const props = defineProps<{
  device: CssMapDevice
  display: CssMapDisplayOptions
  screen: CssMapDeviceScreenRect
}>()

const { t } = useI18n()
const selectedFiveMId = ref<string | null>(null)

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
const statusLabel = computed(() => (
  props.device.runtime.status ? t(`threeMap.overlay.status.${props.device.runtime.status}`) : '--'
))
const loadRateLabel = computed(() => (
  props.device.runtime.loadRate === null ? '--' : `${props.device.runtime.loadRate}%`
))
const hasStaffing = computed(() => (
  props.display.showStaffing && props.device.runtime.staff.length > 0
))
const hasFiveMChanges = computed(() => (
  props.display.showFiveMChanges && props.device.runtime.fiveMChanges.length > 0
))
const layoutPlan = computed(() => planCssMapDeviceNode({
  screen: props.screen,
  display: props.display,
  staffCount: props.device.runtime.staff.length,
  fiveMCount: props.device.runtime.fiveMChanges.length,
}))
const displayMode = computed(() => layoutPlan.value.mode)
const isUltraTiny = computed(() => (
  displayMode.value === 'micro' && (props.screen.width < 8 || props.screen.height < 8)
))
const isCompactDetails = computed(() => displayMode.value === 'compact')
const showStaffingDetails = computed(() => layoutPlan.value.showStaffingDetails)
const showFiveMDetails = computed(() => layoutPlan.value.showFiveMDetails)
const showDetailSummary = computed(() => layoutPlan.value.showDetailSummary)
const showDetailRow = computed(() => showStaffingDetails.value || showFiveMDetails.value)
const showLoadCaption = computed(() => displayMode.value !== 'micro')
const contentScale = computed(() => layoutPlan.value.contentScale)
const surfaceStyle = computed(() => {
  const scale = Math.max(props.screen.scale, 0.001)
  const width = Math.max(props.screen.width, 1)
  const height = Math.max(props.screen.height, 1)
  const style: Record<string, string> = {
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${1 / scale})`,
  }

  if (displayMode.value === 'full') {
    const scaleValue = contentScale.value

    style['--css-map-node-body-padding'] = `${8 * scaleValue}px`
    style['--css-map-node-body-gap'] = `${8 * scaleValue}px`
    style['--css-map-node-load-height'] = `${34 * scaleValue}px`
    style['--css-map-node-detail-height'] = `${56 * scaleValue}px`
    style['--css-map-node-content-font-size'] = `${14 * scaleValue}px`
    style['--css-map-node-load-padding-x'] = `${8 * scaleValue}px`
    style['--css-map-node-load-padding-y'] = `${5 * scaleValue}px`
  }

  if (displayMode.value === 'micro') {
    const padding = Math.max(0, Math.min(2, height * 0.04))
    const gap = Math.max(0, Math.min(2, height * 0.03))
    const headerHeight = Math.max(0, Math.min(22, height * 0.58))
    const loadHeight = Math.max(0, height - headerHeight - padding * 2 - gap - 2)
    const fontSize = Math.max(1, Math.min(8, width * 0.18, height * 0.24))

    style['--css-map-node-header-height'] = `${headerHeight}px`
    style['--css-map-node-body-padding'] = `${padding}px`
    style['--css-map-node-body-gap'] = `${gap}px`
    style['--css-map-node-load-height'] = `${loadHeight}px`
    style['--css-map-node-font-size'] = `${fontSize}px`
    style['--css-map-node-content-font-size'] = `${fontSize}px`
    style['--css-map-node-header-padding-x'] = `${Math.max(0, Math.min(3, width * 0.08))}px`
    style['--css-map-node-header-padding-y'] = `${Math.max(0, Math.min(1, height * 0.03))}px`
    style['--css-map-node-load-padding-x'] = `${Math.max(0, Math.min(2, width * 0.08))}px`
    style['--css-map-node-load-padding-y'] = `${Math.max(0, Math.min(1, height * 0.03))}px`
  }

  return style
})
const summaryFiveMGlyphs = computed(() => (
  props.device.runtime.fiveMChanges.map((change) => getFiveMGlyph(change.category))
))

function getFiveMGlyph(category: CssMapFiveMCategory) {
  return getCssMapFiveMGlyph(category)
}

function getFiveMLabel(category: CssMapFiveMCategory) {
  return t(`threeMap.overlay.fiveM.categories.${category}`)
}

function toggleFiveMDetail(id: string) {
  selectedFiveMId.value = selectedFiveMId.value === id ? null : id
}
</script>

<template>
  <article
    class="css-map-device-node"
    :class="[
      `css-map-device-node--${displayMode}`,
      { 'css-map-device-node--ultra-tiny': isUltraTiny },
    ]"
    :style="surfaceStyle"
    :data-device-id="device.id"
    :data-display-mode="displayMode"
    :data-content-scale="contentScale.toFixed(2)"
  >
    <header
      class="css-map-device-node__header"
      :style="{ background: titleStyle.background, color: titleStyle.color }"
    >
      <strong class="css-map-device-node__name">{{ device.name }}</strong>
      <span class="css-map-device-node__status">{{ statusLabel }}</span>
    </header>

    <div
      class="css-map-device-node__body"
      :style="bodyStyle"
    >
      <section class="css-map-device-node__load">
        <span v-if="showLoadCaption">{{ t('threeMap.overlay.loadRate') }}</span>
        <strong>{{ loadRateLabel }}</strong>
      </section>

      <div
        v-if="showDetailRow"
        class="css-map-device-node__details"
      >
        <div
          v-if="showStaffingDetails"
          class="css-map-device-node__staff"
          aria-label="staff assignment"
        >
          <CssMapStaffShiftPie
            v-for="staff in device.runtime.staff"
            :key="staff.id"
            :color="getCssMapStaffColor(staff.category)"
            :angle="getCssMapStaffShiftAngle(staff.shift)"
            :compact="isCompactDetails"
            :scale="contentScale"
            :title="t(`threeMap.overlay.staffing.${staff.shift}Shift`)"
          />
        </div>

        <div
          v-if="showFiveMDetails"
          class="css-map-device-node__five-m"
          aria-label="5M changes"
        >
          <div class="css-map-device-node__five-m-badges">
            <CssMapFiveMBadge
              v-for="change in device.runtime.fiveMChanges"
              :key="change.id"
              :category="change.category"
              :glyph="getFiveMGlyph(change.category)"
              :label="getFiveMLabel(change.category)"
              :detail="change.label"
              :compact="isCompactDetails"
              :expanded="selectedFiveMId === change.id"
              @toggle="toggleFiveMDetail(change.id)"
            />
          </div>
        </div>
      </div>

      <div
        v-else-if="showDetailSummary"
        class="css-map-device-node__summary"
      >
        <span
          v-if="hasStaffing"
          class="css-map-device-node__summary-item css-map-device-node__summary-item--staff"
          :title="t('threeMap.overlay.staffing.label')"
        >
          {{ device.runtime.staff.length }}
        </span>
        <span
          v-if="hasFiveMChanges"
          class="css-map-device-node__summary-item css-map-device-node__summary-item--five-m"
          :title="t('threeMap.overlay.fiveM.label')"
        >
          <span
            v-for="(glyph, index) in summaryFiveMGlyphs"
            :key="`${device.id}-summary-five-m-${index}`"
          >
            {{ glyph }}
          </span>
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.css-map-device-node {
  --css-map-node-header-height: 44px;
  --css-map-node-body-padding: 8px;
  --css-map-node-body-gap: 8px;
  --css-map-node-load-height: 34px;
  --css-map-node-detail-height: 56px;
  --css-map-node-font-size: 14px;
  --css-map-node-content-font-size: 14px;
  --css-map-node-header-padding-x: 10px;
  --css-map-node-header-padding-y: 6px;
  --css-map-node-load-padding-x: 8px;
  --css-map-node-load-padding-y: 5px;
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  grid-template-rows: var(--css-map-node-header-height) minmax(0, 1fr);
  overflow: visible;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #14213d;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
  font-size: var(--css-map-node-font-size);
  line-height: 1.26;
  transform-origin: top left;
  backdrop-filter: blur(10px);
}

.css-map-device-node *,
.css-map-device-node *::before,
.css-map-device-node *::after {
  box-sizing: border-box;
}

.css-map-device-node__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 8px;
  height: var(--css-map-node-header-height);
  min-height: 0;
  overflow: hidden;
  padding: var(--css-map-node-header-padding-y) var(--css-map-node-header-padding-x);
  font-size: 1.04em;
  font-weight: 800;
}

.css-map-device-node__name,
.css-map-device-node__status {
  min-width: 0;
  overflow: hidden;
}

.css-map-device-node__name {
  display: -webkit-box;
  line-height: 1.08;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.css-map-device-node__status {
  max-width: 7em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
  padding: 0.18em 0.46em;
  font-size: 0.78em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-device-node__body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--css-map-node-body-gap);
  min-height: 0;
  overflow: visible;
  padding: var(--css-map-node-body-padding);
  font-size: var(--css-map-node-content-font-size);
  transition: background 160ms ease;
}

.css-map-device-node__load {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 0;
  height: var(--css-map-node-load-height);
  overflow: hidden;
  padding: var(--css-map-node-load-padding-y) var(--css-map-node-load-padding-x);
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.68);
  gap: 8px;
}

.css-map-device-node__load span {
  color: rgba(20, 33, 61, 0.68);
  min-width: 0;
  overflow: hidden;
  font-size: 0.86em;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-device-node__load strong {
  overflow: hidden;
  font-size: 1.42em;
  letter-spacing: 0;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-device-node__details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--css-map-node-detail-height);
  gap: 8px;
  overflow: visible;
}

.css-map-device-node__staff,
.css-map-device-node__five-m {
  display: flex;
  align-items: center;
  min-height: 0;
}

.css-map-device-node__staff {
  flex: 0 1 auto;
  flex-wrap: nowrap;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
  padding: 0;
}

.css-map-device-node__five-m {
  position: relative;
  flex: 0 1 auto;
  justify-content: flex-end;
  min-width: 0;
  overflow: visible;
  padding: 0;
  font-weight: 900;
  line-height: 1.1;
  pointer-events: auto;
}

.css-map-device-node__five-m-badges {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.2em;
}

.css-map-device-node__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 18px;
  overflow: hidden;
  gap: 4px;
  font-size: 0.9em;
  font-weight: 900;
  line-height: 1;
}

.css-map-device-node__summary-item {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  height: 18px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #14213d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-device-node__summary-item--staff {
  justify-content: center;
  min-width: 24px;
  padding: 0 7px;
  color: #1677ff;
}

.css-map-device-node__summary-item--five-m {
  justify-content: flex-end;
  gap: 2px;
  padding: 0 6px;
}

.css-map-device-node--compact {
  --css-map-node-header-height: 36px;
  --css-map-node-body-padding: 5px;
  --css-map-node-body-gap: 5px;
  --css-map-node-load-height: 26px;
  --css-map-node-detail-height: 24px;
  --css-map-node-font-size: 12px;
  --css-map-node-header-padding-x: 7px;
  --css-map-node-header-padding-y: 4px;
  --css-map-node-load-padding-x: 6px;
  --css-map-node-load-padding-y: 3px;
  border-radius: 6px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
}

.css-map-device-node--compact .css-map-device-node__header {
  gap: 5px;
}

.css-map-device-node--compact .css-map-device-node__status {
  max-width: 6em;
  padding: 0.12em 0.34em;
}

.css-map-device-node--compact .css-map-device-node__load {
  border-radius: 5px;
}

.css-map-device-node--compact .css-map-device-node__staff {
  gap: 4px;
}

.css-map-device-node--summary {
  --css-map-node-header-height: 30px;
  --css-map-node-body-padding: 4px;
  --css-map-node-body-gap: 3px;
  --css-map-node-load-height: 18px;
  --css-map-node-font-size: 10px;
  --css-map-node-header-padding-x: 5px;
  --css-map-node-header-padding-y: 3px;
  --css-map-node-load-padding-x: 5px;
  --css-map-node-load-padding-y: 2px;
  overflow: hidden;
  border-radius: 5px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
}

.css-map-device-node--summary .css-map-device-node__header {
  gap: 4px;
}

.css-map-device-node--summary .css-map-device-node__status {
  max-width: 5.6em;
  padding: 0.1em 0.3em;
}

.css-map-device-node--summary .css-map-device-node__load {
  border-radius: 4px;
}

.css-map-device-node--micro {
  --css-map-node-header-height: 22px;
  --css-map-node-body-padding: 2px;
  --css-map-node-body-gap: 2px;
  --css-map-node-load-height: 14px;
  --css-map-node-font-size: 8px;
  --css-map-node-header-padding-x: 3px;
  --css-map-node-header-padding-y: 1px;
  --css-map-node-load-padding-x: 2px;
  --css-map-node-load-padding-y: 1px;
  overflow: hidden;
  border-width: 0;
  border-radius: 4px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.css-map-device-node--micro .css-map-device-node__header {
  display: block;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  max-width: 100%;
  gap: 2px;
}

.css-map-device-node--micro .css-map-device-node__name {
  display: block;
  width: 100%;
  max-width: 100%;
  text-overflow: clip;
  white-space: nowrap;
  -webkit-line-clamp: 1;
}

.css-map-device-node--micro .css-map-device-node__status {
  display: none;
  max-width: 4.5em;
  padding: 0;
  background: transparent;
}

.css-map-device-node--micro .css-map-device-node__load {
  justify-content: center;
  width: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.42);
}

.css-map-device-node--micro .css-map-device-node__load strong {
  max-width: 100%;
  font-size: 1.08em;
}

.css-map-device-node--ultra-tiny .css-map-device-node__header,
.css-map-device-node--ultra-tiny .css-map-device-node__body {
  display: none;
}
</style>
