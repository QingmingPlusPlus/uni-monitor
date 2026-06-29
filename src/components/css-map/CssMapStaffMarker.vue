<script setup lang="ts">
import { computed } from 'vue'
import {
  getCssMapStaffColor,
  getCssMapStaffShiftAngle,
} from './css3dMapPalette'
import type { CssMapStaffAssignment } from './css3dMapTypes'

const props = defineProps<{
  readonly staff: CssMapStaffAssignment
}>()

const markerStyle = computed(() => ({
  '--css-map-staff-marker-angle': `${getCssMapStaffShiftAngle(props.staff.shift)}deg`,
  '--css-map-staff-marker-color': getCssMapStaffColor(props.staff.category),
}))

const markerTitle = computed(() => (
  `${props.staff.name} / ${props.staff.shift === 'full' ? '全班' : '半班'}`
))
</script>

<template>
  <span
    class="css-map-staff-marker"
    :style="markerStyle"
    :title="markerTitle"
    aria-hidden="true"
  />
</template>

<style scoped>
.css-map-staff-marker {
  display: inline-block;
  width: var(--css-map-staff-marker-size, 18px);
  aspect-ratio: 1;
  border: 1px solid rgba(21, 43, 70, 0.28);
  border-radius: 999px;
  background:
    conic-gradient(
      from -90deg,
      var(--css-map-staff-marker-color) 0deg,
      var(--css-map-staff-marker-color) var(--css-map-staff-marker-angle),
      rgba(255, 255, 255, 0.35) var(--css-map-staff-marker-angle),
      rgba(255, 255, 255, 0.35) 360deg
    );
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.7);
  box-sizing: border-box;
  flex: 0 0 auto;
}
</style>
