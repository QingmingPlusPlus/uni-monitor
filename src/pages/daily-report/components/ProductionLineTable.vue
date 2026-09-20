<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ReportLineRow } from '../../../api/dailyReport'
import { percent } from '../reportModel'
import MetricValue from './MetricValue.vue'
const props = defineProps<{ row: ReportLineRow; rank: number; deviceMode: boolean }>()
const expanded = ref(false)
watch(() => props.row, () => { expanded.value = false })
const times = [
  { key: 'totalRunSeconds', label: '总运转时间' }, { key: 'plannedStopSeconds', label: '计划停止时间' },
  { key: 'productionSeconds', label: '生产时间' }, { key: 'lossSeconds', label: '阻碍时间' },
] as const
</script>

<template>
  <article class="production-line-card">
    <div class="report-rank-number production-rank-number">No.{{ rank }}</div>
    <div class="report-table-scroll" tabindex="0" :aria-label="`${row.name}生产与阻碍明细`">
      <div class="production-line-tables">
        <table class="report-table production-line-metrics">
          <colgroup><col v-for="n in 10" :key="n" /></colgroup>
          <tbody>
            <tr class="production-label-row"><th colspan="4">{{ deviceMode ? '设备' : '生产线' }}</th><th colspan="2">计划数</th><th colspan="2">实绩数</th><th colspan="2">达成率</th></tr>
            <tr class="production-value-row"><th colspan="4">{{ row.name }}<small v-if="row.name !== row.id" class="report-cell-note">{{ row.id }}</small></th><td colspan="2"><MetricValue :metric="row.plan" plain /></td><td colspan="2"><MetricValue :metric="row.actual" plain /></td><td colspan="2" class="production-alert-cell">{{ percent(row.actual, row.plan, 1) }}</td></tr>
            <tr class="production-label-row"><th v-for="time in times" :key="time.key" colspan="2">{{ time.label }}</th><th colspan="2">可动率</th></tr>
            <tr><td v-for="time in times" :key="time.key" colspan="2" :class="{ 'production-highlight-cell': time.key === 'lossSeconds' }"><MetricValue :metric="row[time.key]" hours plain /></td><td colspan="2" class="production-highlight-cell">{{ deviceMode ? '—' : percent(row.productionSeconds, row.availableSeconds, 1) }}</td></tr>
          </tbody>
        </table>
        <table class="report-table production-line-reasons">
          <thead><tr><th>阻碍项目</th><th>阻碍时间</th><th>次数</th><th>占比</th></tr></thead>
          <tbody><tr v-for="(reason, index) in (expanded ? row.reasons : row.reasons?.slice(0, 3)) ?? []" :key="reason.code"><th>{{ index + 1 }}. {{ reason.name }}</th><td><MetricValue :metric="reason.durationSeconds" hours plain /></td><td><MetricValue :metric="reason.count" plain /></td><td>{{ deviceMode ? '—' : percent(reason.durationSeconds, row.availableSeconds) }}</td></tr>
            <tr v-if="!row.reasons?.length"><td colspan="4" class="production-empty-cell">{{ row.reasons === null ? '暂无阻碍数据' : '未返回阻碍记录' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <button role="button" v-if="row.reasons && row.reasons.length > 3" class="report-text-button production-expand" :aria-expanded="expanded" @click="expanded = !expanded">{{ expanded ? '收起原因' : `展开全部 ${row.reasons.length} 项原因` }}</button>
  </article>
</template>
