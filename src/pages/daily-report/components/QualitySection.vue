<script setup lang="ts">
import { computed } from 'vue'
import type { QualityReport, ReportProcessType } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { percent, rankQuality } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
const props = defineProps<{ state: SectionState<QualityReport>; process: ReportProcessType }>()
defineEmits<{ retry: [] }>()
const dimension = computed(() => props.state.data?.meta.qualityDimension ?? (props.process === 'sulfur_addition' ? 'mold' : 'production_number'))
const rankedRows = computed(() => rankQuality(props.state.data?.rows ?? [], props.process, dimension.value))
// 全零或缺完整排行输入时保留明细，不生成名次。
const rows = computed(() => rankedRows.value.length ? rankedRows.value : props.state.data?.rows ?? [])
const reasonRows = (row: QualityReport['rows'][number]) => [row.reasons?.[0], row.reasons?.[1]]
</script>

<template>
  <ReportSection class="quality-section" title="3. 品质实绩" :status="state.status" :message="state.message" @retry="$emit('retry')">
    <div class="quality-table-heading"><span class="report-muted">单位：数量＝个</span></div>
    <div class="report-table-scroll quality-table-wrap" tabindex="0" aria-label="品质实绩表，可横向滚动">
      <table class="report-table report-quality-table">
        <colgroup><col class="quality-rank-column" /><col class="quality-name-column" /><col /><col /><col /><col /><col class="quality-reason-column" /><col /><col /></colgroup>
        <thead><tr><th aria-label="排名"></th><th>{{ dimension === 'mold' ? '模具' : '制番' }}</th><th>实绩数</th><th>合格数</th><th>不良数</th><th>不良率</th><th>不良现象</th><th>不良数</th><th>不良率</th></tr></thead>
        <tbody v-for="(row, index) in rows" :key="row.id">
          <tr v-for="(reason, reasonIndex) in reasonRows(row)" :key="reasonIndex">
            <template v-if="reasonIndex === 0">
              <th rowspan="2" class="quality-rank">{{ rankedRows.length ? 'No.' + (index + 1) : '—' }}</th>
              <th rowspan="2" class="quality-name">{{ row.name }}<span v-if="row.lines.length" class="quality-associated-names">{{ row.lines.map(line => line.name).join('、') }}</span></th>
              <td rowspan="2"><MetricValue :metric="row.actual" plain /></td>
              <td rowspan="2"><MetricValue :metric="row.qualified" plain /></td>
              <td rowspan="2"><MetricValue :metric="row.defective" plain /></td>
              <td rowspan="2">{{ percent(row.defective, row.actual) }}</td>
            </template>
            <th class="quality-reason" :class="{ 'quality-primary-reason': reasonIndex === 0 }">{{ reason ? (reasonIndex === 0 ? '①' : '②') + reason.name : '—' }}</th>
            <td :class="{ 'quality-primary-reason': reasonIndex === 0 }"><MetricValue :metric="reason?.count" plain /></td>
            <td :class="{ 'quality-primary-reason': reasonIndex === 0 }">{{ percent(reason?.count, row.actual) }}</td>
          </tr>
        </tbody>
        <tbody v-if="!rows.length"><tr><td colspan="9" class="quality-empty-cell">—</td></tr></tbody>
      </table>
    </div>
  </ReportSection>
</template>
