<script setup lang="ts">
import { computed } from 'vue'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from './css3dMapTypes'
import {
  getCssMapProcessOptionsForDepartment,
  isCssMapDepartmentValueInConfig,
  isCssMapProcessValueInConfig,
} from './css3dMapSelection'

const props = defineProps<{
  readonly selectionConfig: CssMapSelectionConfig
  readonly selectedDepartment: CssMapDepartmentValue
  readonly selectedProcess: CssMapProcessValue | null
}>()

const emit = defineEmits<{
  selectDepartment: [value: CssMapDepartmentValue]
  selectProcess: [value: CssMapProcessValue]
  clearProcess: []
}>()

const processOptions = computed(() => {
  return getCssMapProcessOptionsForDepartment(props.selectedDepartment, props.selectionConfig)
})

function selectDepartment(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return
  if (!isCssMapDepartmentValueInConfig(event.target.value, props.selectionConfig)) return
  emit('selectDepartment', event.target.value)
}

function selectProcess(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  if (value === '') {
    emit('clearProcess')
    return
  }

  if (!isCssMapProcessValueInConfig(value, props.selectionConfig)) return
  emit('selectProcess', value)
}

function clearProcess(): void {
  emit('clearProcess')
}
</script>

<template>
  <div
    class="css-map-toolbar"
    data-css-map-control="true"
    role="group"
    aria-label="地图维度选择"
    @pointerdown.stop
    @wheel.stop
  >
    <label class="css-map-toolbar__field">
      <span>部门</span>
      <select
        class="css-map-toolbar__select"
        :value="selectedDepartment"
        @change="selectDepartment"
      >
        <option
          v-for="option in selectionConfig.departmentOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.labelKey }}
        </option>
      </select>
    </label>

    <div
      class="css-map-toolbar__field"
      role="group"
      aria-label="工序选择"
    >
      <span>工序</span>
      <div class="css-map-toolbar__process-control">
        <select
          class="css-map-toolbar__select"
          :value="selectedProcess ?? ''"
          aria-label="工序"
          @change="selectProcess"
        >
          <option value="">选择工序</option>
          <option
            v-for="option in processOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.labelKey }}
          </option>
        </select>
        <button
          class="css-map-toolbar__clear-button"
          type="button"
          :disabled="selectedProcess === null"
          aria-label="清空工序选择"
          title="清空工序选择"
          @click="clearProcess"
        >
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.css-map-toolbar {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 4;
  display: flex;
  max-width: calc(100% - 36px);
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.css-map-toolbar__field {
  display: flex;
  height: 54px;
  min-width: 216px;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(36, 113, 255, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  padding: 0 12px 0 14px;
  box-shadow: 0 10px 24px rgba(21, 43, 70, 0.12);
  color: var(--um-color-text-primary);
}

.css-map-toolbar__field span {
  flex: 0 0 auto;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}

.css-map-toolbar__select {
  width: 132px;
  min-width: 0;
  border: 1px solid var(--um-color-border);
  border-radius: 6px;
  background: var(--um-color-surface);
  color: var(--um-color-text-primary);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  outline: none;
  padding: 8px 10px;
}

.css-map-toolbar__select:focus {
  border-color: var(--um-color-operation);
}

.css-map-toolbar__process-control {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.css-map-toolbar__clear-button {
  flex: 0 0 auto;
  border: 1px solid rgba(36, 113, 255, 0.28);
  border-radius: 6px;
  background: rgba(36, 113, 255, 0.08);
  color: var(--um-color-operation);
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
  outline: none;
  padding: 8px 10px;
}

.css-map-toolbar__clear-button:focus {
  border-color: var(--um-color-operation);
}

.css-map-toolbar__clear-button:disabled {
  border-color: rgba(122, 138, 160, 0.22);
  background: rgba(122, 138, 160, 0.08);
  color: var(--um-color-text-secondary);
  cursor: not-allowed;
  opacity: 0.62;
}

@media (max-width: 900px) {
  .css-map-toolbar {
    left: 12px;
    right: auto;
    max-width: calc(100% - 64px);
    flex-wrap: wrap;
  }

  .css-map-toolbar__field {
    flex: 1 1 180px;
  }

  .css-map-toolbar__select {
    flex: 1 1 auto;
    width: auto;
  }

  .css-map-toolbar__process-control {
    flex: 1 1 auto;
  }
}
</style>
