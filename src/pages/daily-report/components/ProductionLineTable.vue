<script setup lang="ts">
import { computed } from 'vue'
import type { ReportLineRow } from '../../../api/dailyReport'
import { percent, formatReportedRatio } from '../reportModel'
import MetricValue from './MetricValue.vue'
const props = defineProps<{ row: ReportLineRow; rank: number }>()
const reasonSlots = computed(() => Array.from({ length: 3 }, (_, index) => props.row.reasons?.[index] ?? null))
const reasonNumbers = ['①', '②', '③']
const times = [
  { key: 'totalRunSeconds', label: '总运转时间' },
  { key: 'plannedStopSeconds', label: '计划停止时间' },
  { key: 'productionSeconds', label: '生产时间' }, { key: 'lossSeconds', label: '阻碍时间' },
] as const
</script>

<template>
  <article class="production-line-card">
    <div class="report-table-scroll production-table-wrap" tabindex="0" :aria-label="`${row.name}生产与阻碍明细`">
      <table class="report-table production-line-table">
        <colgroup><col v-for="(width, index) in [5, 9.5, 23.5, 9.5, 9.5, 9.5, 14.5, 9.5, 4.5, 5]" :key="index" :style="{ width: `${width}%` }" /></colgroup>
        <tbody>
          <tr class="report-table-label-row">
            <th rowspan="4" scope="rowgroup" class="production-rank-number">No.{{ rank }}</th>
            <th colspan="2" scope="colgroup">生产线</th><th scope="col">计划数</th><th scope="col">实绩数</th><th scope="col">达成率</th>
            <th scope="col">阻碍项目</th><th scope="col">阻碍时间</th><th scope="col">次数</th><th scope="col">占比</th>
          </tr>
          <tr v-for="(reason, index) in reasonSlots" :key="index">
            <template v-if="index === 0">
              <th colspan="2" class="production-name-cell production-key-value">{{ row.name }}</th>
              <td class="production-key-value"><MetricValue :metric="row.plan" plain /></td>
              <td class="production-key-value"><MetricValue :metric="row.actual" plain /></td>
              <td class="production-key-value production-alert-cell">{{ percent(row.actual, row.plan, 1) }}</td>
            </template>
            <template v-else-if="index === 1">
              <th v-for="time in times" :key="time.key" class="report-table-label">{{ time.label }}</th><th class="report-table-label">可动率</th>
            </template>
            <template v-else>
              <td v-for="time in times" :key="time.key" :class="{ 'production-alert-cell': time.key === 'lossSeconds' }"><MetricValue :metric="row[time.key]" hours plain /></td>
              <td class="production-alert-cell">{{ formatReportedRatio(row.reportedAvailabilityRate) }}</td>
            </template>
            <td class="production-reason-cell production-reason-name" :class="{ 'production-reason-empty': !reason }">{{ reason ? `${reasonNumbers[index]}${reason.name}` : '—' }}</td>
            <td class="production-reason-cell" :class="{ 'production-reason-empty': !reason }"><MetricValue :metric="reason?.durationSeconds" hours plain /></td>
            <td class="production-reason-cell" :class="{ 'production-reason-empty': !reason }"><MetricValue :metric="reason?.count" plain /></td>
            <td class="production-reason-cell" :class="{ 'production-reason-empty': !reason }">{{ formatReportedRatio(reason?.reportedRatio) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>
