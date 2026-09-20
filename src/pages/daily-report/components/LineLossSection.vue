<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LineLossReport } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { percent, rankLines, ratio, formatReportTimestamp } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
import ProductionLineTable from './ProductionLineTable.vue'
const props = defineProps<{ state: SectionState<LineLossReport> }>()
defineEmits<{ retry: [] }>()
const rows = computed(() => rankLines(props.state.data?.rows ?? []))
const deviceMode = computed(() => props.state.data?.meta.lineDimension !== 'line')
const showAll = ref(false)
watch(() => props.state.data, () => { showAll.value = false })
const emptyMessage = computed(() => {
  const all = props.state.data?.rows ?? []
  if (!all.length) return '所选日期、部门和工序暂无匹配记录'
  return all.some(row => ratio(row.actual, row.plan) === null)
    ? '暂无可排名记录，计划或实绩不完整；已有数据可展开查看'
    : '暂无达成率低于90%的记录'
})
</script>

<template>
  <ReportSection class="production-lines" :title="deviceMode ? '达成率最差设备（90%以下）' : '达成率最差生产线（90%以下）'" :status="state.status" :message="state.message" @retry="$emit('retry')">
    <div class="production-table-heading"><span class="report-muted">{{ deviceMode ? '当前按设备展示，尚无生产线归属' : '按达成率从低到高，最多展示3条' }}</span><span class="report-muted">单位：时间＝小时/日；数量＝个/日</span></div>
    <div v-if="!rows.length" class="report-empty">{{ emptyMessage }}</div>
    <div v-else class="production-ranking-list"><ProductionLineTable v-for="(row, index) in rows" :key="row.id" :row="row" :rank="index + 1" :device-mode="deviceMode" /></div>
    <button role="button" v-if="state.data?.rows.length" class="report-text-button" :aria-expanded="showAll" @click="showAll = !showAll">{{ showAll ? '收起明细' : '查看全部 ' + state.data.rows.length + (deviceMode ? ' 台设备明细' : ' 条生产线明细') }}</button>
    <div v-if="showAll" class="report-table-scroll production-table-wrap" tabindex="0" aria-label="全部生产明细">
      <table class="report-table report-device-table"><thead><tr><th>{{ deviceMode ? '设备' : '生产线' }}</th><th>计划数</th><th>实绩数</th><th>达成率</th><th>总运转时间</th><th>计划停止时间</th><th>生产时间</th><th>阻碍时间</th><th>可动率</th><th>阻碍明细</th></tr></thead><tbody>
        <tr v-for="row in state.data?.rows ?? []" :key="row.id"><th>{{ row.name }}<small v-if="row.name !== row.id" class="report-cell-note">{{ row.id }}</small></th><td><MetricValue :metric="row.plan" /></td><td><MetricValue :metric="row.actual" /></td><td>{{ percent(row.actual, row.plan) }}</td><td><MetricValue :metric="row.totalRunSeconds" hours plain /></td><td><MetricValue :metric="row.plannedStopSeconds" hours plain /></td><td><MetricValue :metric="row.productionSeconds" hours plain /></td><td><MetricValue :metric="row.lossSeconds" hours plain /></td><td>{{ deviceMode ? '—' : percent(row.productionSeconds, row.availableSeconds, 1) }}</td><td><span v-if="!row.reasons?.length">{{ row.reasons === null ? '暂无阻碍数据' : '未返回阻碍记录' }}</span><details v-else><summary>{{ row.reasons.length }} 项原因</summary><p v-for="reason in row.reasons" :key="reason.code">{{ reason.name }}：<MetricValue :metric="reason.durationSeconds" hours plain /> 小时 / <MetricValue :metric="reason.count" plain /> 次</p></details></td></tr>
      </tbody></table>
    </div>
    <details v-if="state.data" class="production-source-details"><summary>数据说明</summary><p>数据归属日：{{ state.data.meta.date }} · {{ state.data.meta.timeZone }} · 读取时间：{{ formatReportTimestamp(state.data.meta.updatedAt, state.data.meta.timeZone) }}</p><p v-for="note in state.data.meta.notes" :key="note">{{ note }}</p><button role="button" class="report-text-button" @click="$emit('retry')">重新读取排行数据</button></details>
  </ReportSection>
</template>
