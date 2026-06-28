<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CssMapFiveMBadge from './CssMapFiveMBadge.vue'
import CssMapEquipmentMicroNode from './CssMapEquipmentMicroNode.vue'
import CssMapStaffShiftPie from './CssMapStaffShiftPie.vue'
import {
  planCssMapDeviceNode,
  shouldShowCssMapMergedDeviceChildren,
} from './css3dMapLayout'
import {
  getCssMapFiveMGlyph,
  getCssMapLoadRateBackground,
  getCssMapStaffColor,
  getCssMapStaffShiftAngle,
  getCssMapTitleStyle,
} from './css3dMapPalette'
import type {
  CssMapDevice,
  CssMapDeviceChild,
  CssMapDeviceScreenRect,
  CssMapDisplayOptions,
  CssMapFiveMCategory,
  CssMapDeviceRuntime,
} from './css3dMapTypes'

const props = defineProps<{
  device: CssMapDevice
  display: CssMapDisplayOptions
  screen: CssMapDeviceScreenRect
}>()
const emit = defineEmits<{
  (event: 'navigate-child', payload: { child: CssMapDeviceChild, event: Event }): void
}>()

const { t } = useI18n()
const selectedFiveMId = ref<string | null>(null)
const showingChildren = ref(false)
const childPointerDown = ref<{
  key: string
  pointerId: number
  x: number
  y: number
} | null>(null)
const childLastTap = ref<{
  key: string
  time: number
  x: number
  y: number
} | null>(null)

const CHILD_NAVIGATION_DOUBLE_TAP_MS = 420
const CHILD_NAVIGATION_MOVE_TOLERANCE = 10
const CHILD_NAVIGATION_TAP_DISTANCE = 28

const layoutPlan = computed(() => planCssMapDeviceNode({
  screen: props.screen,
  display: props.display,
  staffCount: props.device.runtime.staff.length,
  fiveMCount: props.device.runtime.fiveMChanges.length,
}))
const displayMode = computed(() => layoutPlan.value.mode)
const contentScale = computed(() => layoutPlan.value.contentScale)
const isCompactDetails = computed(() => displayMode.value === 'compact')
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
const showLoadCaption = computed(() => displayMode.value !== 'micro')
const showStaffingDetails = computed(() => layoutPlan.value.showStaffingDetails)
const showFiveMDetails = computed(() => layoutPlan.value.showFiveMDetails)
const showDetailSummary = computed(() => layoutPlan.value.showDetailSummary)
const hasStaffing = computed(() => props.display.showStaffing && props.device.runtime.staff.length > 0)
const hasFiveMChanges = computed(() => (
  props.display.showFiveMChanges && props.device.runtime.fiveMChanges.length > 0
))
const showChildren = computed(() => displayMode.value !== 'micro' && showingChildren.value)
const summaryFiveMGlyphs = computed(() => (
  props.device.runtime.fiveMChanges.map((change) => getFiveMGlyph(change.category))
))
const surfaceStyle = computed(() => {
  const scale = Math.max(props.screen.scale, 0.001)
  const width = Math.max(props.screen.width, 1)
  const height = Math.max(props.screen.height, 1)
  const scaleValue = contentScale.value
  const style: Record<string, string> = {
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${1 / scale})`,
    '--css-map-equipment-scale': `${scaleValue}`,
    '--css-map-equipment-header-height': `${Math.max(24, Math.min(height * 0.34, 46 * scaleValue))}px`,
    '--css-map-equipment-padding': `${Math.max(3, 8 * scaleValue)}px`,
    '--css-map-equipment-gap': `${Math.max(2, 7 * scaleValue)}px`,
    '--css-map-equipment-font-size': `${Math.max(8, 13 * scaleValue)}px`,
    '--css-map-equipment-load-font-size': `${Math.max(12, 26 * scaleValue)}px`,
    '--css-map-equipment-detail-height': `${Math.max(18, 44 * scaleValue)}px`,
  }

  if (displayMode.value === 'summary') {
    style['--css-map-equipment-header-height'] = `${Math.max(18, Math.min(height * 0.42, 30))}px`
    style['--css-map-equipment-padding'] = `${Math.max(2, Math.min(4, height * 0.07))}px`
    style['--css-map-equipment-gap'] = `${Math.max(1, Math.min(3, height * 0.05))}px`
    style['--css-map-equipment-font-size'] = `${Math.max(8, Math.min(11, height * 0.14))}px`
    style['--css-map-equipment-load-font-size'] = `${Math.max(10, Math.min(16, height * 0.22))}px`
  }

  return style
})

watch(
  () => [
    props.screen.width,
    props.screen.height,
    props.device.children.length,
  ] as const,
  () => {
    showingChildren.value = shouldShowCssMapMergedDeviceChildren({
      screen: props.screen,
      childCount: props.device.children.length,
      current: showingChildren.value,
    })
  },
  { immediate: true },
)

function getFiveMGlyph(category: CssMapFiveMCategory) {
  return getCssMapFiveMGlyph(category)
}

function getFiveMLabel(category: CssMapFiveMCategory) {
  return t(`threeMap.overlay.fiveM.categories.${category}`)
}

function toggleFiveMDetail(id: string) {
  selectedFiveMId.value = selectedFiveMId.value === id ? null : id
}

function formatRuntimeLoadRate(runtime: CssMapDeviceRuntime) {
  return runtime.loadRate === null ? '--' : `${runtime.loadRate}%`
}

function getChildStyle(child: CssMapDeviceChild) {
  const titleStyle = getCssMapTitleStyle(child.runtime.status, props.display.showStatusColor)

  return {
    left: `${child.x}%`,
    top: `${child.y}%`,
    width: `${child.w}%`,
    height: `${child.h}%`,
    background: getCssMapLoadRateBackground(
      child.runtime.loadRate,
      props.display.showLoadRateColor,
    ),
    '--css-map-child-status-background': titleStyle.background,
    '--css-map-child-status-color': titleStyle.color,
  }
}

function getChildTitle(child: CssMapDeviceChild) {
  const status = child.runtime.status
    ? t(`threeMap.overlay.status.${child.runtime.status}`)
    : '--'

  return `${child.name} / ${status} / ${formatRuntimeLoadRate(child.runtime)}`
}

function isPrimaryPointer(event: PointerEvent) {
  return event.pointerType !== 'mouse' || event.button === 0
}

function handleChildPointerDown(event: PointerEvent, child: CssMapDeviceChild) {
  if (!isPrimaryPointer(event)) return
  event.preventDefault()
  childPointerDown.value = {
    key: child.id,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  }
}

function handleChildPointerCancel() {
  childPointerDown.value = null
}

function handleChildPointerUp(event: PointerEvent, child: CssMapDeviceChild) {
  if (!isPrimaryPointer(event)) return
  event.preventDefault()

  const pointerDown = childPointerDown.value
  childPointerDown.value = null

  if (!pointerDown || pointerDown.pointerId !== event.pointerId || pointerDown.key !== child.id) return

  const moveDistance = Math.hypot(
    event.clientX - pointerDown.x,
    event.clientY - pointerDown.y,
  )
  if (moveDistance > CHILD_NAVIGATION_MOVE_TOLERANCE) {
    childLastTap.value = null
    return
  }

  const lastTap = childLastTap.value
  const tapDistance = lastTap
    ? Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y)
    : Number.POSITIVE_INFINITY

  if (
    lastTap &&
    lastTap.key === child.id &&
    event.timeStamp - lastTap.time <= CHILD_NAVIGATION_DOUBLE_TAP_MS &&
    tapDistance <= CHILD_NAVIGATION_TAP_DISTANCE
  ) {
    childLastTap.value = null
    emit('navigate-child', { child, event })
    return
  }

  childLastTap.value = {
    key: child.id,
    time: event.timeStamp,
    x: event.clientX,
    y: event.clientY,
  }
}

function handleChildDoubleClick(event: MouseEvent, child: CssMapDeviceChild) {
  event.preventDefault()
  childPointerDown.value = null
  childLastTap.value = null
  emit('navigate-child', { child, event })
}
</script>

<template>
  <CssMapEquipmentMicroNode
    v-if="displayMode === 'micro'"
    :device="device"
    :display="display"
    :screen="screen"
  />

  <article
    v-else
    class="css-map-equipment-node"
    :class="[
      `css-map-equipment-node--${displayMode}`,
      { 'css-map-equipment-node--children': showChildren },
    ]"
    :style="surfaceStyle"
    :data-device-id="device.id"
    :data-display-mode="displayMode"
    :data-content-scale="contentScale.toFixed(2)"
  >
    <header
      class="css-map-equipment-node__header"
      :style="{
        background: titleStyle.background,
        color: titleStyle.color,
      }"
    >
      <strong>{{ device.name }}</strong>
      <span>{{ statusLabel }}</span>
    </header>

    <div
      class="css-map-equipment-node__body"
      :style="bodyStyle"
    >
      <div
        v-if="showChildren"
        class="css-map-equipment-node__children"
      >
        <button
          v-for="child in device.children"
          :key="child.id"
          type="button"
          class="css-map-equipment-node__child"
          :style="getChildStyle(child)"
          :title="getChildTitle(child)"
          :data-device-code="child.deviceCode"
          @pointerdown.stop="(event: PointerEvent) => handleChildPointerDown(event, child)"
          @pointerup.stop="(event: PointerEvent) => handleChildPointerUp(event, child)"
          @pointercancel.stop="handleChildPointerCancel"
          @dblclick.stop="(event: MouseEvent) => handleChildDoubleClick(event, child)"
        >
          <strong>{{ child.name }}</strong>
          <span class="css-map-equipment-node__child-footer">
            <span>{{ formatRuntimeLoadRate(child.runtime) }}</span>
            <span
              v-if="(display.showStaffing && child.runtime.staff.length > 0) ||
                (display.showFiveMChanges && child.runtime.fiveMChanges.length > 0)"
              class="css-map-equipment-node__child-meta"
            >
              <span v-if="display.showStaffing && child.runtime.staff.length > 0">
                {{ child.runtime.staff.length }}
              </span>
              <span v-if="display.showFiveMChanges && child.runtime.fiveMChanges.length > 0">
                <span
                  v-for="change in child.runtime.fiveMChanges"
                  :key="`${child.id}-${change.id}`"
                >
                  {{ getFiveMGlyph(change.category) }}
                </span>
              </span>
            </span>
          </span>
        </button>
      </div>

      <section
        v-else
        class="css-map-equipment-node__load"
      >
        <span v-if="showLoadCaption">{{ t('threeMap.overlay.loadRate') }}</span>
        <strong>{{ loadRateLabel }}</strong>
      </section>

      <div
        v-if="!showChildren && (showStaffingDetails || showFiveMDetails)"
        class="css-map-equipment-node__details"
      >
        <div
          v-if="showStaffingDetails"
          class="css-map-equipment-node__staff"
          :title="t('threeMap.overlay.staffing.label')"
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
          class="css-map-equipment-node__five-m"
          :title="t('threeMap.overlay.fiveM.label')"
        >
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

      <div
        v-else-if="!showChildren && showDetailSummary"
        class="css-map-equipment-node__summary"
      >
        <span v-if="hasStaffing">{{ device.runtime.staff.length }}</span>
        <span v-if="hasFiveMChanges">
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
.css-map-equipment-node {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  grid-template-rows: var(--css-map-equipment-header-height) minmax(0, 1fr);
  overflow: visible;
  border: 1px solid rgba(20, 33, 61, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
  color: #14213d;
  font-size: var(--css-map-equipment-font-size);
  line-height: 1.18;
  transform-origin: top left;
  backdrop-filter: blur(10px);
}

.css-map-equipment-node *,
.css-map-equipment-node *::before,
.css-map-equipment-node *::after {
  box-sizing: border-box;
}

.css-map-equipment-node__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.58em;
  min-height: 0;
  overflow: hidden;
  padding: 0.36em 0.64em;
  font-weight: 900;
}

.css-map-equipment-node__header strong {
  min-width: 0;
  overflow: hidden;
  line-height: 1.05;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
}

.css-map-equipment-node__header span {
  max-width: 7.5em;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
  padding: 0.18em 0.48em;
  font-size: 0.78em;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__body {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: var(--css-map-equipment-gap);
  min-height: 0;
  overflow: visible;
  padding: var(--css-map-equipment-padding);
  transition: background 160ms ease;
}

.css-map-equipment-node__load {
  display: grid;
  min-height: 0;
  align-content: center;
  justify-items: center;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.68);
  padding: 0.28em 0.48em;
}

.css-map-equipment-node__load span {
  max-width: 100%;
  overflow: hidden;
  color: rgba(20, 33, 61, 0.66);
  font-size: 0.78em;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__load strong {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--css-map-equipment-load-font-size);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 0.96;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__children {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.56);
}

.css-map-equipment-node__child {
  position: absolute;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-top: 4px solid var(--css-map-child-status-background);
  border-radius: 5px;
  background: transparent;
  color: #14213d;
  cursor: pointer;
  font: inherit;
  line-height: 1.05;
  outline: none;
  padding: 0.28em 0.34em 0.3em;
  text-align: left;
  touch-action: manipulation;
}

.css-map-equipment-node__child:focus-visible {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.34);
}

.css-map-equipment-node__child strong,
.css-map-equipment-node__child-footer {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.css-map-equipment-node__child strong {
  align-self: stretch;
  color: var(--css-map-child-status-color);
  font-size: max(8px, calc(var(--css-map-equipment-font-size) * 0.84));
  font-weight: 950;
  overflow-wrap: anywhere;
}

.css-map-equipment-node__child-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.24em;
}

.css-map-equipment-node__child-footer > span:first-child {
  min-width: 0;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.76);
  padding: 0.12em 0.36em;
  font-size: max(8px, calc(var(--css-map-equipment-font-size) * 0.88));
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node__child-meta {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.18em;
  overflow: hidden;
  color: rgba(20, 33, 61, 0.72);
  font-size: max(7px, calc(var(--css-map-equipment-font-size) * 0.76));
  font-weight: 950;
  line-height: 1;
  white-space: nowrap;
}

.css-map-equipment-node__child-meta > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.08em;
  overflow: hidden;
}

.css-map-equipment-node__details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--css-map-equipment-detail-height);
  gap: var(--css-map-equipment-gap);
  overflow: visible;
}

.css-map-equipment-node__staff,
.css-map-equipment-node__five-m {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.34em;
}

.css-map-equipment-node__staff {
  overflow: hidden;
}

.css-map-equipment-node__five-m {
  justify-content: flex-end;
  overflow: visible;
  pointer-events: auto;
}

.css-map-equipment-node__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 1.7em;
  overflow: hidden;
  gap: 0.3em;
  font-size: 0.9em;
  font-weight: 900;
  line-height: 1;
}

.css-map-equipment-node__summary > span {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  padding: 0.2em 0.46em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-map-equipment-node--compact {
  border-radius: 6px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
}

.css-map-equipment-node--compact .css-map-equipment-node__header {
  gap: 0.4em;
  padding: 0.28em 0.5em;
}

.css-map-equipment-node--compact .css-map-equipment-node__load,
.css-map-equipment-node--summary .css-map-equipment-node__load {
  border-radius: 5px;
}

.css-map-equipment-node--summary {
  overflow: hidden;
  border-radius: 5px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
}

.css-map-equipment-node--summary .css-map-equipment-node__header {
  gap: 0.3em;
  padding: 0.22em 0.42em;
}

.css-map-equipment-node--summary .css-map-equipment-node__header span {
  max-width: 5.8em;
}

.css-map-equipment-node--children .css-map-equipment-node__body {
  display: block;
  overflow: hidden;
}

.css-map-equipment-node--children .css-map-equipment-node__children {
  width: 100%;
  height: 100%;
}

.css-map-equipment-node--minimal {
  overflow: hidden;
  border-width: 0;
  border-radius: 4px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.css-map-equipment-node--minimal .css-map-equipment-node__header {
  display: block;
  padding: 0.12em 0.28em;
}

.css-map-equipment-node--minimal .css-map-equipment-node__header strong {
  display: block;
  width: 100%;
  max-width: 100%;
  text-overflow: clip;
  white-space: nowrap;
}

.css-map-equipment-node--minimal .css-map-equipment-node__header span,
.css-map-equipment-node--minimal .css-map-equipment-node__load span {
  display: none;
}

.css-map-equipment-node--minimal .css-map-equipment-node__body {
  gap: var(--css-map-equipment-gap);
}

.css-map-equipment-node--minimal .css-map-equipment-node__load {
  border: 0;
  border-radius: 3px;
  padding: 0.08em 0.18em;
}

.css-map-equipment-node--ultra-tiny .css-map-equipment-node__header,
.css-map-equipment-node--ultra-tiny .css-map-equipment-node__body {
  display: none;
}
</style>
