<script setup lang="ts">
import type { ReportLineRow } from '../../../api/dailyReport'
import { percent, formatReportedRatio } from '../reportModel'
import MetricValue from './MetricValue.vue'
defineProps<{ row: ReportLineRow; rank: number }>()
const times = [
  { key: 'totalRunSeconds', label: '总运转时间' },
  { key: 'productionSeconds', label: '生产时间' }, { key: 'lossSeconds', label: '阻碍时间' },
] as const
</script>

<template>
  <article class="production-line-card">
    <div class="report-rank-number production-rank-number">No.{{ rank }}</div>
    <div class="report-table-scroll" tabindex="0" :aria-label="`${row.name}生产与阻碍明细`">
      <div class="production-line-tables">
        <table class="report-table production-line-metrics">
          <colgroup><col v-for="n in 4" :key="n" /></colgroup>
          <tbody>
            <tr class="production-label-row"><th>生产线</th><th>计划数</th><th>实绩数</th><th>达成率</th></tr>
            <tr class="production-value-row"><th>{{ row.name }}</th><td><MetricValue :metric="row.plan" plain /></td><td><MetricValue :metric="row.actual" plain /></td><td class="production-alert-cell">{{ percent(row.actual, row.plan, 1) }}</td></tr>
            <tr class="production-label-row"><th v-for="time in times" :key="time.key">{{ time.label }}</th><th>可动率</th></tr>
            <tr><td v-for="time in times" :key="time.key" :class="{ 'production-highlight-cell': time.key === 'lossSeconds' }"><MetricValue :metric="row[time.key]" hours plain /></td><td class="production-highlight-cell">{{ formatReportedRatio(row.reportedAvailabilityRate) }}</td></tr>
          </tbody>
        </table>
        <table class="report-table production-line-reasons">
          <thead><tr><th>阻碍项目</th><th>阻碍时间</th><th>次数</th><th>占比</th></tr></thead>
          <tbody><tr v-for="(reason, index) in row.reasons?.slice(0, 3) ?? []" :key="reason.code"><th>{{ index + 1 }}. {{ reason.name }}</th><td><MetricValue :metric="reason.durationSeconds" hours plain /></td><td><MetricValue :metric="reason.count" plain /></td><td>{{ formatReportedRatio(reason.reportedRatio) }}</td></tr>
            <tr v-if="!row.reasons?.length"><td colspan="4" class="production-empty-cell">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </article>
</template>
