<script setup lang="ts">
import type { CssMapFiveMCategory } from './css3dMapTypes'

defineProps<{
  category: CssMapFiveMCategory
  glyph: string
  label: string
  detail: string
  expanded: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    class="css-map-five-m-badge"
    :class="[
      `css-map-five-m-badge--${category}`,
      { 'css-map-five-m-badge--compact': compact },
    ]"
    type="button"
    :aria-expanded="expanded"
    @pointerdown.stop
    @click.stop="emit('toggle')"
  >
    {{ glyph }}
    <span
      v-if="expanded"
      class="css-map-five-m-badge__popover"
      role="tooltip"
    >
      <strong>{{ label }}</strong>
      <span>{{ detail }}</span>
    </span>
  </button>
</template>

<style scoped>
.css-map-five-m-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.92em;
  height: 2.92em;
  border: 1px solid rgba(20, 33, 61, 0.2);
  border-radius: 0.28em;
  color: #ffffff;
  cursor: pointer;
  flex: none;
  font: inherit;
  font-size: 0.86em;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  text-shadow: 0 1px 1px rgba(20, 33, 61, 0.34);
  transform: skew(-7deg);
  box-shadow:
    inset 0 0.14em 0.18em rgba(255, 255, 255, 0.42),
    inset 0 -0.16em 0.16em rgba(20, 33, 61, 0.18),
    0 0.14em 0 rgba(20, 33, 61, 0.22),
    0 0.22em 0.34em rgba(20, 33, 61, 0.18);
}

.css-map-five-m-badge--man {
  background: linear-gradient(145deg, #22c55e, #15803d);
}

.css-map-five-m-badge--machine {
  background: linear-gradient(145deg, #1677ff, #1d4ed8);
}

.css-map-five-m-badge--material {
  background: linear-gradient(145deg, #f59e0b, #b45309);
}

.css-map-five-m-badge--method {
  background: linear-gradient(145deg, #8b5cf6, #6d28d9);
}

.css-map-five-m-badge--environment {
  background: linear-gradient(145deg, #14b8a6, #0f766e);
}

.css-map-five-m-badge__popover {
  position: absolute;
  bottom: calc(100% + 0.35em);
  left: 50%;
  z-index: 4;
  display: grid;
  width: max-content;
  max-width: 16em;
  gap: 0.2em;
  border: 1px solid rgba(20, 33, 61, 0.14);
  border-radius: 0.38em;
  background: rgba(255, 255, 255, 0.98);
  padding: 0.48em 0.58em;
  color: #14213d;
  box-shadow: 0 0.36em 1em rgba(20, 33, 61, 0.18);
  font-size: 0.86em;
  font-weight: 800;
  line-height: 1.25;
  text-align: left;
  text-shadow: none;
  transform: translateX(-50%) skew(7deg);
}

.css-map-five-m-badge__popover strong,
.css-map-five-m-badge__popover span {
  overflow-wrap: anywhere;
}

.css-map-five-m-badge--compact {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 11px;
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.32),
    inset 0 -2px 3px rgba(20, 33, 61, 0.16),
    0 2px 0 rgba(20, 33, 61, 0.18);
}

.css-map-five-m-badge--compact .css-map-five-m-badge__popover {
  font-size: 10px;
}
</style>
