<script setup lang="ts">
import { computed } from 'vue'
import { getCssMapFiveMVisualStyle } from './css3dMapPalette'
import type { CssMapFiveMChange } from './css3dMapTypes'

const props = defineProps<{
  readonly change: CssMapFiveMChange
}>()

const visualStyle = computed(() => getCssMapFiveMVisualStyle(props.change.category))

const markerStyle = computed(() => ({
  '--css-map-five-m-fill': visualStyle.value.fill,
  '--css-map-five-m-color': visualStyle.value.color,
  '--css-map-five-m-border': visualStyle.value.border,
}))
</script>

<template>
  <span
    class="css-map-five-m-marker"
    :style="markerStyle"
    :title="change.label"
  >
    {{ visualStyle.glyph }}
  </span>
</template>

<style scoped>
.css-map-five-m-marker {
  display: inline-grid;
  position: relative;
  width: var(--css-map-five-m-marker-size, 18px);
  aspect-ratio: 1;
  place-items: center;
  box-sizing: border-box;
  color: var(--css-map-five-m-color);
  flex: 0 0 auto;
  font-size: max(7px, calc(var(--css-map-node-font-size) * 0.72));
  font-weight: 900;
  line-height: 1;
  isolation: isolate;
}

.css-map-five-m-marker::before,
.css-map-five-m-marker::after {
  position: absolute;
  z-index: -1;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  content: "";
  pointer-events: none;
}

.css-map-five-m-marker::before {
  inset: 0;
  background: var(--css-map-five-m-border);
  filter: drop-shadow(0 1px 1px rgba(21, 43, 70, 0.18));
}

.css-map-five-m-marker::after {
  inset: 1px;
  background: var(--css-map-five-m-fill);
}
</style>
