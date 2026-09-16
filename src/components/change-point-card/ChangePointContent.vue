<script setup lang="ts">
import { computed } from 'vue'
import TableChartEchart from '../table-chart-card/TableChartEchart.vue'
import type { ChartOptionConfig } from '../table-chart-card/TableChartCard.types'
import type { ChangePointData } from '../../pages/factory-dashboard/data/loaders/loadChangePointCard'
const props = withDefaults(defineProps<{ data: ChangePointData; expanded?: boolean }>(), { expanded: false })
const displayDays = computed(() => props.expanded ? props.data.days : props.data.weekDays)
const displayRows = computed(() => props.expanded ? props.data.rows : props.data.weekRows)
const pieTotal = computed(() => props.data.rows.reduce((sum, row) => sum + (row.allTotal ?? 0), 0))
const pieOption = computed<ChartOptionConfig>(() => ({
  animation: false,
  tooltip: { trigger: 'item', formatter: '{b}：{c} 件（{d}%）' },
  series: [{
    type: 'pie', radius: '62%', center: ['50%', '50%'], minAngle: 3,
    label: { formatter: '{b}\n{d}%', fontSize: 15, color: '#53657A' },
    labelLine: { length: 10, length2: 8 },
    data: props.data.rows.filter(row => (row.allTotal ?? 0) > 0).map(row => ({
      name: row.label, value: row.allTotal, itemStyle: { color: row.color },
    })),
  }],
}))
const chartOption = computed<ChartOptionConfig>(() => ({
  animation: false,
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { top: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 15, color: '#53657A' } },
  grid: { left: 40, right: 12, top: 65, bottom: 30 },
  xAxis: { type: 'category', data: displayDays.value.map(String), axisTick: { show: false }, axisLabel: { fontSize: 15 } },
  yAxis: { type: 'value', min: 0, minInterval: 1, axisLabel: { fontSize: 15 }, splitLine: { lineStyle: { color: '#D8E2EE' } } },
  series: displayRows.value.map(row => ({
    name: row.label, type: 'bar', stack: 'changes', barMaxWidth: 22,
    itemStyle: { color: row.color }, data: row.days,
  })),
}))
</script>

<template>
  <view class="change-point-content">
    <view class="change-point-content__charts">
      <view class="change-point-content__trend">
        <text class="change-point-content__heading">变化点件数推移图</text>
        <TableChartEchart class="change-point-content__chart" :option="chartOption" :update-options="{ notMerge: true }" />
      </view>
      <view class="change-point-content__disposal">
        <text class="change-point-content__heading">变化点类别占比</text>
        <text class="change-point-content__hint">当前范围全部数据 · 不限周/月</text>
        <TableChartEchart v-if="pieTotal > 0" class="change-point-content__pie" :option="pieOption" :update-options="{ notMerge: true }" />
        <view v-else class="change-point-content__empty">{{ data.status === 'ready' ? '暂无变化点数据' : '数据暂不可用' }}</view>
      </view>
    </view>
    <view class="change-point-content__scroll" tabindex="0" :aria-label="expanded ? '变化点全月每日件数，可横向滚动' : '变化点本周每日件数'">
      <table class="change-point-content__table">
        <thead><tr><th scope="col">日期</th><th scope="col">{{ expanded ? '月累计' : '周累计' }}</th><th v-for="day in displayDays" :key="day" scope="col">{{ day }}</th></tr></thead>
        <tbody>
          <tr v-for="row in displayRows" :key="row.label">
            <th scope="row"><span class="change-point-content__dot" :style="{ background: row.color }" />{{ row.label }}</th>
            <td class="change-point-content__total">{{ row.total ?? '—' }}</td>
            <td v-for="(value, index) in row.days" :key="index">{{ value ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </view>
    <text class="change-point-content__hint">单位：件。{{ expanded ? '展示整月' : '展示本周' }}每日件数，未来日期与不可用数据为“—”；饼图统计当前范围的全部变化点。</text>
  </view>
</template>

<style scoped>
.change-point-content { min-width: 0; }
.change-point-content__charts { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr); gap: 20px; margin-bottom: 16px; }
.change-point-content__trend, .change-point-content__disposal { min-width: 0; }
.change-point-content__heading { display: block; font-size: 20px; font-weight: 700; margin-bottom: 12px; }
.change-point-content__chart { height: 270px; width: 100%; }
.change-point-content__hint { display: block; color: var(--um-color-text-secondary); font-size: 15px; line-height: 1.6; }
.change-point-content__pie { height: 240px; width: 100%; }
.change-point-content__empty { height: 240px; display: flex; align-items: center; justify-content: center; color: var(--um-color-text-secondary); font-size: 15px; }
.change-point-content__scroll { overflow-x: auto; margin-bottom: 12px; border: 1px solid var(--um-color-border); border-radius: 8px; }
.change-point-content__table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 17px; font-variant-numeric: tabular-nums; text-align: center; }
.change-point-content__table th, .change-point-content__table td { min-width: 42px; height: 34px; padding: 3px 6px; border-right: 1px solid var(--um-color-border); border-bottom: 1px solid var(--um-color-border); white-space: nowrap; }
.change-point-content__table thead th { background: var(--um-color-operation-soft); font-weight: 600; }
.change-point-content__table tr > :first-child { position: sticky; left: 0; min-width: 76px; z-index: 1; background: var(--um-color-surface); }
.change-point-content__table thead tr > :first-child { background: var(--um-color-operation-soft); }
.change-point-content__table tbody tr:last-child > * { border-bottom: 0; }
.change-point-content__total { font-weight: 700; background: var(--um-color-surface-subtle); }
.change-point-content__dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; }
@media (max-width: 700px) { .change-point-content__charts { grid-template-columns: 1fr; } }
</style>
