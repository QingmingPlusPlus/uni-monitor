<script setup lang="ts">
import type { ProductionReport, LineLossReport } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { percent, formatReportTimestamp } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
import LineLossSection from './LineLossSection.vue'
defineProps<{ state: SectionState<ProductionReport>; lines: SectionState<LineLossReport> }>()
defineEmits<{ retry: []; retryLines: [] }>()
const columns = [
  { key: 'plan', label: '计划数' }, { key: 'actual', label: '实绩数' },
  { key: 'qualified', label: '合格数' }, { key: 'flowing', label: '流动数' },
  { key: 'defective', label: '不良数' }, { key: 'scrapped', label: '废弃数' },
] as const
</script>

<template>
  <ReportSection class="production-section" title="2. 生产实绩" :status="state.status" :message="state.message" @retry="$emit('retry')">
    <div class="production-table-heading"><span class="report-danger">前日</span><span class="report-muted">单位：数量＝个/日</span></div>
    <div class="report-table-scroll production-table-wrap" tabindex="0" aria-label="生产实绩表，可横向滚动">
      <table class="report-table report-production-table">
        <thead><tr><th>品种</th><th v-for="column in columns" :key="column.key">{{ column.label }}<small v-if="column.key === 'scrapped'" class="production-header-note">含不良</small></th><th>达成率</th><th>合格率</th></tr></thead>
        <tbody><tr v-for="row in state.data?.rows ?? []" :key="row.id"><th>{{ row.name }}</th>
          <td v-for="column in columns" :key="column.key"><MetricValue :metric="row[column.key]" plain /></td>
          <td>{{ percent(row.actual, row.plan) }}</td><td>{{ percent(row.qualified, row.actual) }}</td>
        </tr><tr v-if="!state.data?.rows.length"><td colspan="9" class="production-empty-cell">所选日期、部门和工序暂无匹配生产记录</td></tr></tbody>
      </table>
    </div>
    <details v-if="state.data" class="production-source-details"><summary>数据说明</summary><p>数据归属日：{{ state.data.meta.date }} · {{ state.data.meta.timeZone }} · 读取时间：{{ formatReportTimestamp(state.data.meta.updatedAt, state.data.meta.timeZone) }}</p><p v-for="note in state.data.meta.notes" :key="note">{{ note }}</p><button role="button" class="report-text-button" @click="$emit('retry')">重新读取生产数据</button></details>
    <template #after><LineLossSection :state="lines" @retry="$emit('retryLines')" /></template>
  </ReportSection>
</template>
