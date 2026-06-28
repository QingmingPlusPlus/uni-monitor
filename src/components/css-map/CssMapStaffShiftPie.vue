<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  color: string
  angle: number
  compact?: boolean
  scale?: number
}>()

const normalizedAngle = computed(() => Math.min(Math.max(props.angle, 0), 360))

const pieStyle = computed(() => ({
  '--css-map-staff-pie-color': props.color,
  '--css-map-staff-pie-angle': `${normalizedAngle.value}deg`,
  '--css-map-staff-pie-size': `${props.compact ? 20 : 56 * (props.scale ?? 1)}px`,
  '--css-map-staff-pie-sector-size': `${props.compact ? 14 : 40 * (props.scale ?? 1)}px`,
  '--css-map-staff-pie-border-size': `${props.compact ? 1 : 2 * (props.scale ?? 1)}px`,
}))
</script>

<template>
  <span
    class="css-map-staff-shift-pie"
    :class="{ 'css-map-staff-shift-pie--compact': compact }"
    :style="pieStyle"
    aria-hidden="true"
  >
    <span class="css-map-staff-shift-pie__sector" />
  </span>
</template>

<style scoped>
.css-map-staff-shift-pie {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--css-map-staff-pie-size);
  height: var(--css-map-staff-pie-size);
  border: var(--css-map-staff-pie-border-size) solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  background: rgba(226, 232, 240, 0.94);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
  flex: 0 0 auto;
  overflow: hidden;
}

.css-map-staff-shift-pie__sector {
  width: var(--css-map-staff-pie-sector-size);
  height: var(--css-map-staff-pie-sector-size);
  border-radius: 50%;
  background: conic-gradient(
    var(--css-map-staff-pie-color) 0deg var(--css-map-staff-pie-angle),
    transparent var(--css-map-staff-pie-angle) 360deg
  );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.48);
}

.css-map-staff-shift-pie--compact {
  border-width: 1px;
}
</style>
