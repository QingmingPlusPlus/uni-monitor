<script setup lang="ts">
import { cssMapStatusPalette, getCssMapLoadRateBackground } from './css3dMapPalette'
import type { CssMapDeviceStatus } from './css3dMapTypes'

const loadRateItems = [
  { label: '0-30%', color: getCssMapLoadRateBackground(30) },
  { label: '31-40%', color: getCssMapLoadRateBackground(40) },
  { label: '41-60%', color: getCssMapLoadRateBackground(60) },
  { label: '61-80%', color: getCssMapLoadRateBackground(80) },
  { label: '81-100%', color: getCssMapLoadRateBackground(100) },
  { label: '>100%', color: getCssMapLoadRateBackground(101) },
] as const

const statusItems: readonly { readonly status: CssMapDeviceStatus; readonly label: string }[] = [
  { status: 'production', label: '生产中' },
  { status: 'abnormalStop', label: '异常停止' },
  { status: 'plannedStop', label: '计划停止' },
  { status: 'changeover', label: '切替' },
  { status: 'cleaning', label: '清扫' },
]
</script>

<template>
  <div
    class="css-map-legend"
    data-css-map-control="true"
    aria-label="地图图例"
    @pointerdown.stop
    @wheel.stop
  >
    <table class="css-map-legend__table">
      <thead>
        <tr>
          <th>颜色</th>
          <th>负荷率</th>
          <th>颜色</th>
          <th>工况</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in loadRateItems"
          :key="item.label"
        >
          <td><span :style="{ background: item.color }" /></td>
          <td>{{ item.label }}</td>
          <td>
            <span
              v-if="statusItems[index]"
              :style="{
                background: cssMapStatusPalette[statusItems[index].status].background,
                borderColor: cssMapStatusPalette[statusItems[index].status].border,
              }"
            />
          </td>
          <td>{{ statusItems[index]?.label ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.css-map-legend {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 4;
  overflow: hidden;
  border: 1px solid rgba(21, 43, 70, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 26px rgba(21, 43, 70, 0.14);
  color: var(--um-color-text-primary);
}

.css-map-legend__table {
  border-collapse: collapse;
  min-width: 344px;
  table-layout: fixed;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.css-map-legend__table th,
.css-map-legend__table td {
  height: 28px;
  border: 1px solid rgba(21, 43, 70, 0.14);
  padding: 3px 8px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.css-map-legend__table th {
  background: var(--um-color-surface-subtle);
  color: var(--um-color-text-primary);
  font-size: 12px;
}

.css-map-legend__table th:nth-child(1),
.css-map-legend__table th:nth-child(3),
.css-map-legend__table td:nth-child(1),
.css-map-legend__table td:nth-child(3) {
  width: 52px;
  padding: 0;
}

.css-map-legend__table span {
  display: block;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  min-height: 28px;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .css-map-legend {
    left: 12px;
    bottom: 12px;
    max-width: calc(100% - 24px);
    overflow-x: auto;
  }
}
</style>
