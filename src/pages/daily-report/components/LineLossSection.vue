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
const deviceMode = computed(() => props.state.data?.meta.lineDimension !== 'line')
const showAll = ref(false)
const expanded = ref<Record<string, boolean>>({})
watch(() => props.state.data, () => { expanded.value = {}; showAll.value = false })
const times = computed(() => deviceMode.value ? [
  { key: 'totalRunSeconds', label: '总运转时间' }, { key: 'productionSeconds', label: '生产时间' }, { key: 'lossSeconds', label: '阻碍时间' },
] as const : [
  { key: 'availableSeconds', label: '可运转时间' }, { key: 'plannedStopSeconds', label: '计划停止时间' },
  { key: 'productionSeconds', label: '生产时间' }, { key: 'lossSeconds', label: '阻碍时间' },
] as const)
</script>

<template>
  <ReportSection :title="deviceMode ? '2-1. 设备生产与阻碍' : '2-1. 低达成率生产线'" :subtitle="deviceMode ? '完整范围按设备展示 · 达成率低于90%的最低3台优先展示 · 时间：小时/日' : '达成率低于90% · 最低3条 · 时间：小时/日。可运转时间已扣除计划停止时间。'" :status="state.status" :meta="state.data?.meta" :message="state.message" @retry="$emit('retry')">
    <button role="button" v-if="deviceMode && rows.length" class="report-text-button" @click="showAll = !showAll">{{ showAll ? '查看低达成率设备' : `查看全部 ${state.data?.rows.length} 台设备` }}</button>
    <div v-if="deviceMode && (!rows.length || showAll) && state.data?.rows.length" class="report-table-scroll" tabindex="0" aria-label="全部设备生产与阻碍明细">
      <table class="report-table report-device-table"><thead><tr><th>设备</th><th>计划数</th><th>实绩数</th><th>达成率</th><th>总运转时间</th><th>生产时间</th><th>阻碍时间</th><th>可动率原始值</th><th>阻碍明细</th></tr></thead><tbody>
        <tr v-for="row in state.data.rows" :key="row.id"><th>{{ row.name }}<small class="report-cell-note">{{ row.id }}</small></th><td><MetricValue :metric="row.plan" /></td><td><MetricValue :metric="row.actual" /></td><td>{{ percent(row.actual, row.plan) }}</td><td><MetricValue :metric="row.totalRunSeconds" hours /></td><td><MetricValue :metric="row.productionSeconds" hours /></td><td><MetricValue :metric="row.lossSeconds" hours /></td><td><MetricValue :metric="row.reportedAvailabilityRate" :digits="4" /></td><td>
          <span v-if="row.reasons === null" class="report-muted">未提供</span><span v-else-if="!row.reasons.length">无阻碍记录</span><details v-else><summary>{{ row.reasons.length }} 项原因</summary><div v-for="reason in row.reasons" :key="reason.code">{{ reason.name }}：<MetricValue :metric="reason.durationSeconds" hours /> 小时 / <MetricValue :metric="reason.count" /> 次 / 占比原始值 <MetricValue :metric="reason.reportedRatio" :digits="4" /></div></details>
        </td></tr>
      </tbody></table>
    </div>
    <div v-else-if="!rows.length" class="report-empty">暂无可展示的匹配记录；缺失数据不参与达成率排行</div>
    <div v-else class="report-rank-grid">
      <article v-for="(row, index) in rows" :key="row.id" class="report-rank-card">
        <div class="report-rank-heading"><span class="report-rank-number">No.{{ index + 1 }}</span><h3>{{ row.name }}</h3></div>
        <div class="report-kpis">
          <div><span>计划数</span><strong><MetricValue :metric="row.plan" /></strong></div>
          <div><span>实绩数</span><strong><MetricValue :metric="row.actual" /></strong></div>
          <div><span>达成率</span><strong class="report-danger">{{ percent(row.actual, row.plan) }}</strong></div>
        </div>
        <dl class="report-time-list"><div v-for="time in times" :key="time.key"><dt>{{ time.label }}</dt><dd><MetricValue :metric="row[time.key]" hours /></dd></div><div><dt>{{ deviceMode ? '可动率原始值' : '可动率' }}</dt><dd><MetricValue v-if="deviceMode" :metric="row.reportedAvailabilityRate" :digits="4" /><template v-else>{{ percent(row.productionSeconds, row.availableSeconds, 1) }}</template></dd></div></dl>
        <p v-if="row.reasons === null" class="report-muted">阻碍原因未接入</p>
        <p v-else-if="!row.reasons.length" class="report-muted">无阻碍事件</p>
        <div v-else class="report-table-scroll" tabindex="0" :aria-label="`${row.name}阻碍原因`">
          <table class="report-table report-reason-table"><thead><tr><th>阻碍项目</th><th>时间</th><th>次数</th><th>{{ deviceMode ? '占比原始值' : '占比' }}</th></tr></thead><tbody>
            <tr v-for="reason in (expanded[row.id] ? row.reasons : row.reasons.slice(0, 3))" :key="reason.code"><th>{{ reason.name }}</th><td><MetricValue :metric="reason.durationSeconds" hours /></td><td><MetricValue :metric="reason.count" /></td><td><MetricValue v-if="deviceMode" :metric="reason.reportedRatio" :digits="4" /><template v-else>{{ percent(reason.durationSeconds, row.availableSeconds) }}</template></td></tr>
          </tbody></table>
        </div>
        <button role="button" v-if="row.reasons && row.reasons.length > 3" class="report-text-button" :aria-expanded="!!expanded[row.id]" @click="expanded[row.id] = !expanded[row.id]">{{ expanded[row.id] ? '收起原因' : `展开全部 ${row.reasons.length} 项原因` }}</button>
      </article>
    </div>
  </ReportSection>
</template>
