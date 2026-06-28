<script setup lang="ts">
import type { CssMapScreenControlAction } from './css3dMapTypes'

defineProps<{
  readonly selectMode: boolean
}>()

const emit = defineEmits<{
  action: [value: CssMapScreenControlAction]
}>()
</script>

<template>
  <div
    class="css-map-screen-controls"
    data-css-map-control="true"
    role="group"
    aria-label="地图屏幕操作"
    @pointerdown.stop
    @wheel.stop
  >
    <div class="css-map-screen-controls__pad">
      <button
        type="button"
        class="css-map-screen-controls__button css-map-screen-controls__button--up"
        aria-label="向上平移"
        @click="emit('action', 'pan-up')"
      >上</button>
      <button
        type="button"
        class="css-map-screen-controls__button css-map-screen-controls__button--left"
        aria-label="向左平移"
        @click="emit('action', 'pan-left')"
      >左</button>
      <button
        type="button"
        class="css-map-screen-controls__button css-map-screen-controls__button--right"
        aria-label="向右平移"
        @click="emit('action', 'pan-right')"
      >右</button>
      <button
        type="button"
        class="css-map-screen-controls__button css-map-screen-controls__button--down"
        aria-label="向下平移"
        @click="emit('action', 'pan-down')"
      >下</button>
    </div>

    <div class="css-map-screen-controls__stack">
      <button
        type="button"
        class="css-map-screen-controls__button"
        aria-label="放大"
        @click="emit('action', 'zoom-in')"
      >+</button>
      <button
        type="button"
        class="css-map-screen-controls__button"
        aria-label="缩小"
        @click="emit('action', 'zoom-out')"
      >-</button>
      <button
        type="button"
        class="css-map-screen-controls__button"
        aria-label="适配当前选区"
        @click="emit('action', 'focus')"
      >适配</button>
      <button
        type="button"
        class="css-map-screen-controls__button"
        aria-label="重置地图视图"
        @click="emit('action', 'reset')"
      >重置</button>
      <button
        type="button"
        class="css-map-screen-controls__button css-map-screen-controls__select"
        :aria-label="selectMode ? '关闭设备点击选择模式' : '开启设备点击选择模式'"
        :class="{ 'css-map-screen-controls__select--active': selectMode }"
        @click="emit('action', 'select')"
      >
        点选
      </button>
    </div>
  </div>
</template>

<style scoped>
.css-map-screen-controls {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 4;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.css-map-screen-controls__button {
  display: inline-flex;
  min-width: 46px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(36, 113, 255, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--um-color-text-primary);
  box-shadow: 0 8px 20px rgba(21, 43, 70, 0.12);
  cursor: pointer;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.css-map-screen-controls__button:active {
  transform: translateY(1px);
}

.css-map-screen-controls__pad {
  display: grid;
  grid-template-columns: repeat(3, 46px);
  grid-template-rows: repeat(3, 42px);
  gap: 6px;
}

.css-map-screen-controls__button--up {
  grid-column: 2;
  grid-row: 1;
}

.css-map-screen-controls__button--left {
  grid-column: 1;
  grid-row: 2;
}

.css-map-screen-controls__button--right {
  grid-column: 3;
  grid-row: 2;
}

.css-map-screen-controls__button--down {
  grid-column: 2;
  grid-row: 3;
}

.css-map-screen-controls__stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(46px, auto));
  gap: 6px;
}

.css-map-screen-controls__select {
  grid-column: span 2;
}

.css-map-screen-controls__select--active {
  border-color: var(--um-color-operation);
  background: var(--um-color-operation-soft);
  color: var(--um-color-operation);
}

@media (max-width: 900px) {
  .css-map-screen-controls {
    right: 12px;
    bottom: 12px;
    transform: scale(0.9);
    transform-origin: right bottom;
  }
}
</style>
