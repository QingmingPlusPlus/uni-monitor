<script setup lang="ts">
import { computed } from 'vue'
import { getCssMapFiveMGlyph } from './css3dMapPalette'
import type { CssMapFiveMChange } from './css3dMapTypes'

const props = defineProps<{
  readonly change: CssMapFiveMChange
}>()

const glyph = computed(() => getCssMapFiveMGlyph(props.change.category))
</script>

<template>
  <span
    class="css-map-five-m-marker"
    :title="change.label"
  >
    {{ glyph }}
  </span>
</template>

<style scoped>
.css-map-five-m-marker {
  display: inline-grid;
  width: var(--css-map-five-m-marker-size, 18px);
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgba(21, 43, 70, 0.2);
  border-radius: 4px;
  background: rgba(21, 43, 70, 0.92);
  box-shadow: 0 1px 2px rgba(21, 43, 70, 0.18);
  box-sizing: border-box;
  color: #ffffff;
  flex: 0 0 auto;
  font-size: max(9px, calc(var(--css-map-node-font-size) * 0.78));
  font-weight: 900;
  line-height: 1;
}
</style>
