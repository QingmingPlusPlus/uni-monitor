<script setup lang="ts">
import type { ProductionReport } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { percent } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
defineProps<{ state: SectionState<ProductionReport> }>()
defineEmits<{ retry: [] }>()
const columns = [
  { key: 'plan', label: '计划数' }, { key: 'actual', label: '实绩数' },
  { key: 'qualified', label: '合格数' }, { key: 'flowing', label: '流动数' },
  { key: 'defective', label: '不良数' }, { key: 'scrapped', label: '废弃数' },
] as const
</script>

<template>
  <ReportSection title="2. 生产实绩" subtitle="数量：个/日。合格、流动、不良、废弃分别按业务统计口径展示。" :status="state.status" :meta="state.data?.meta" :message="state.message" @retry="$emit('retry')">
    <div v-if="!state.data?.rows.length" class="report-empty">所选日期暂无生产记录</div>
    <div v-else class="report-table-scroll" tabindex="0" aria-label="生产实绩表，可横向滚动">
      <table class="report-table report-production-table">
        <thead><tr><th>品种 / 作业类别</th><th v-for="column in columns" :key="column.key">{{ column.label }}</th><th>达成率</th><th>合格率</th></tr></thead>
        <tbody><tr v-for="row in state.data.rows" :key="row.id"><th>{{ row.name }}</th>
          <td v-for="column in columns" :key="column.key"><MetricValue :metric="row[column.key]" /></td>
          <td>{{ percent(row.actual, row.plan) }}</td><td>{{ percent(row.qualified, row.actual) }}</td>
        </tr></tbody>
      </table>
    </div>
  </ReportSection>
</template>
