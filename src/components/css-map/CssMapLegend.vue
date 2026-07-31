<script setup lang="ts">
import CssMapFiveMMarker from './CssMapFiveMMarker.vue'
import {
  cssMapFiveMCategoryOrder,
  cssMapStatusPalette,
  getCssMapFiveMVisualStyle,
  getCssMapLoadRateBackground,
} from './css3dMapPalette'
import type {
  CssMapDeviceStatus,
  CssMapFiveMChange,
} from './css3dMapTypes'

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

const fiveMItems: readonly {
  readonly category: CssMapFiveMChange['category']
  readonly label: string
  readonly change: CssMapFiveMChange
}[] = cssMapFiveMCategoryOrder.map((category) => {
  const label = getCssMapFiveMVisualStyle(category).glyph

  return {
    category,
    label,
    change: {
      id: `legend-${category}`,
      category,
      label: `5M变化点：${label}`,
    },
  }
})
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
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in loadRateItems"
          :key="item.label"
        >
          <td>
            <span
              class="css-map-legend__swatch"
              :style="{ background: item.color }"
            />
          </td>
          <td>{{ item.label }}</td>
        </tr>
      </tbody>
    </table>

    <table class="css-map-legend__table">
      <thead>
        <tr>
          <th>颜色</th>
          <th>工况</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in statusItems"
          :key="item.status"
        >
          <td>
            <span
              class="css-map-legend__swatch"
              :style="{
                background: item.status === 'abnormalStop'
                  ? 'var(--um-color-danger-soft)'
                  : item.status === 'plannedStop'
                    ? 'var(--um-color-surface-subtle)'
                    : cssMapStatusPalette[item.status].background,
                borderColor: cssMapStatusPalette[item.status].border,
              }"
            />
          </td>
          <td>{{ item.label }}</td>
        </tr>
      </tbody>
    </table>

    <table
      class="css-map-legend__table"
      aria-label="5M变化点图例"
    >
      <thead>
        <tr>
          <th>颜色</th>
          <th>5M变化点</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in fiveMItems"
          :key="item.category"
        >
          <td>
            <div class="css-map-legend__five-m-swatch">
              <CssMapFiveMMarker :change="item.change" />
            </div>
          </td>
          <td>{{ item.label }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.css-map-legend {
  --css-map-legend-top: calc(var(--space-4) + 64rpx + var(--space-2));
  --css-map-legend-control-clearance: 174px;

  position: absolute;
  /* 右上角展示，纵向避让地图展开按钮与弹窗关闭按钮（二者均位于右上角）。
     base 使用 64rpx 按钮高度（<1024px）；>=1024px 在下方媒体查询中切换为 44px。
     top = 按钮顶边距(--space-4，取两者较大者) + 按钮高度 + 间隙(--space-2) */
  top: var(--css-map-legend-top);
  right: var(--space-3);
  z-index: 4;
  display: flex;
  max-height: calc(100% - var(--css-map-legend-top) - var(--css-map-legend-control-clearance));
  flex-direction: column;
  gap: var(--space-2);
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid rgba(21, 43, 70, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 26px rgba(21, 43, 70, 0.14);
  color: var(--um-color-text-primary);
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  touch-action: pan-y;
}

.css-map-legend__table {
  border-collapse: collapse;
  min-width: 172px;
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
  box-sizing: border-box;
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
.css-map-legend__table td:nth-child(1) {
  width: 52px;
  padding: 0;
}

.css-map-legend__swatch {
  display: block;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  min-height: 28px;
  box-sizing: border-box;
}

.css-map-legend__five-m-swatch {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  --css-map-five-m-marker-size: 20px;
  --css-map-node-font-size: 13px;
}

@media (min-width: 1024px) {
  .css-map-legend {
    /* 展开按钮与弹窗关闭按钮在 >=1024px 高度收窄为 44px */
    --css-map-legend-top: calc(var(--space-4) + 44px + var(--space-2));
  }
}

@media (max-width: 900px) {
  .css-map-legend {
    --css-map-legend-control-clearance: 154px;

    right: 12px;
    max-width: calc(100% - 24px);
  }
}
</style>
