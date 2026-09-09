<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { QualityReport, ReportProcessType } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { percent, rankQuality } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
const props = defineProps<{ state: SectionState<QualityReport>; process: ReportProcessType }>()
defineEmits<{ retry: [] }>()
const rows = computed(() => rankQuality(props.state.data?.rows ?? [], props.process))
const expanded = ref<Record<string, boolean>>({})
watch(() => props.state.data, () => { expanded.value = {} })
</script>

<template>
  <ReportSection title="3. 品质实绩" :subtitle="`个数不良率最高3项 · 按${process === 'sulfur_addition' ? '模具' : '制番'}排行 · 数量：个`" :status="state.status" :meta="state.data?.meta" :message="state.message" @retry="$emit('retry')">
    <div v-if="!rows.length" class="report-empty">{{ state.data?.meta.status === 'partial' ? '数据未完成，暂无可参与排行的品质记录' : '暂无符合排行条件的不良记录' }}</div>
    <div v-else class="report-quality-list">
      <article v-for="(row, index) in rows" :key="row.id" class="report-rank-card">
        <div class="report-rank-heading"><span class="report-rank-number">No.{{ index + 1 }}</span><h3>{{ row.name }}</h3><span class="report-badge">{{ row.dimension === 'mold' ? '模具' : '制番' }}</span></div>
        <p class="report-muted">生产线：{{ row.lines.map(line => line.name).join('、') || '—' }}<template v-if="row.dimension === 'mold'"> · 制番：{{ row.productionNumbers.join('、') || '—' }}</template></p>
        <div class="report-quality-body">
          <div class="report-kpis report-kpis--quality"><div><span>实绩数</span><strong><MetricValue :metric="row.actual" /></strong></div><div><span>合格数</span><strong><MetricValue :metric="row.qualified" /></strong></div><div><span>不良数</span><strong><MetricValue :metric="row.defective" /></strong></div><div><span>不良率</span><strong class="report-danger">{{ percent(row.defective, row.actual) }}</strong></div></div>
          <div>
            <p v-if="row.reasons === null" class="report-muted">不良现象未接入</p><p v-else-if="!row.reasons.length" class="report-muted">暂无不良现象分类</p>
            <div v-else class="report-table-scroll" tabindex="0" :aria-label="`${row.name}不良现象`"><table class="report-table report-reason-table"><thead><tr><th>不良现象</th><th>不良数</th><th>不良率</th></tr></thead><tbody><tr v-for="reason in (expanded[row.id] ? row.reasons : row.reasons.slice(0, 2))" :key="reason.code"><th>{{ reason.name }}</th><td><MetricValue :metric="reason.count" /></td><td>{{ percent(reason.count, row.actual) }}</td></tr></tbody></table></div>
            <button role="button" v-if="row.reasons && row.reasons.length > 2" class="report-text-button" :aria-expanded="!!expanded[row.id]" @click="expanded[row.id] = !expanded[row.id]">{{ expanded[row.id] ? '收起现象' : `展开全部 ${row.reasons.length} 项现象` }}</button>
            <p v-if="row.reasonNote" class="report-muted">{{ row.reasonNote }}</p>
          </div>
        </div>
      </article>
    </div>
  </ReportSection>
</template>
