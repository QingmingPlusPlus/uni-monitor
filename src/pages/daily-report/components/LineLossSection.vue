<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LineLossReport } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { percent, rankLines } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
const props = defineProps<{ state: SectionState<LineLossReport> }>()
defineEmits<{ retry: [] }>()
const rows = computed(() => rankLines(props.state.data?.rows ?? []))
const expanded = ref<Record<string, boolean>>({})
watch(() => props.state.data, () => { expanded.value = {} })
const times = [
  { key: 'availableSeconds', label: '可运转时间' }, { key: 'plannedStopSeconds', label: '计划停止时间' },
  { key: 'productionSeconds', label: '生产时间' }, { key: 'lossSeconds', label: '阻碍时间' },
] as const
</script>

<template>
  <ReportSection title="2-1. 低达成率生产线" subtitle="达成率低于90% · 最低3条 · 时间：小时/日。可运转时间已扣除计划停止时间。" :status="state.status" :meta="state.data?.meta" :message="state.message" @retry="$emit('retry')">
    <div v-if="!rows.length" class="report-empty">{{ state.data?.meta.status === 'partial' ? '数据未完成，暂无可参与排行的生产线' : '暂无达成率低于90%的生产线' }}</div>
    <div v-else class="report-rank-grid">
      <article v-for="(row, index) in rows" :key="row.id" class="report-rank-card">
        <div class="report-rank-heading"><span class="report-rank-number">No.{{ index + 1 }}</span><h3>{{ row.name }}</h3></div>
        <div class="report-kpis">
          <div><span>计划数</span><strong><MetricValue :metric="row.plan" /></strong></div>
          <div><span>实绩数</span><strong><MetricValue :metric="row.actual" /></strong></div>
          <div><span>达成率</span><strong class="report-danger">{{ percent(row.actual, row.plan) }}</strong></div>
        </div>
        <dl class="report-time-list"><div v-for="time in times" :key="time.key"><dt>{{ time.label }}</dt><dd><MetricValue :metric="row[time.key]" hours /></dd></div><div><dt>可动率</dt><dd>{{ percent(row.productionSeconds, row.availableSeconds, 1) }}</dd></div></dl>
        <p v-if="row.reasons === null" class="report-muted">阻碍原因未接入</p>
        <p v-else-if="!row.reasons.length" class="report-muted">无阻碍事件</p>
        <div v-else class="report-table-scroll" tabindex="0" :aria-label="`${row.name}阻碍原因`">
          <table class="report-table report-reason-table"><thead><tr><th>阻碍项目</th><th>时间</th><th>次数</th><th>占比</th></tr></thead><tbody>
            <tr v-for="reason in (expanded[row.id] ? row.reasons : row.reasons.slice(0, 3))" :key="reason.code"><th>{{ reason.name }}</th><td><MetricValue :metric="reason.durationSeconds" hours /></td><td><MetricValue :metric="reason.count" /></td><td>{{ percent(reason.durationSeconds, row.availableSeconds) }}</td></tr>
          </tbody></table>
        </div>
        <button role="button" v-if="row.reasons && row.reasons.length > 3" class="report-text-button" :aria-expanded="!!expanded[row.id]" @click="expanded[row.id] = !expanded[row.id]">{{ expanded[row.id] ? '收起原因' : `展开全部 ${row.reasons.length} 项原因` }}</button>
      </article>
    </div>
  </ReportSection>
</template>
