<script setup lang="ts">
import type { ReportMeta } from '../../../api/dailyReport'
import type { SectionStatus } from '../reportResource'
import LoadingIcon from '../../../components/LoadingIcon.vue'
import { formatReportTimestamp } from '../reportModel'
defineProps<{ title: string; subtitle?: string; status: SectionStatus; meta?: ReportMeta; message?: string }>()
defineEmits<{ retry: [] }>()
const labels = { complete: '数据完整', partial: '数据未完成', unavailable: '数据未接入' }
</script>

<template>
  <section class="report-section" :aria-busy="status === 'loading'">
    <div class="report-section-heading">
      <div><h2>{{ title }}</h2><p v-if="subtitle" class="report-muted">{{ subtitle }}</p></div>
      <span v-if="meta" class="report-badge" :class="`report-badge--${meta.status}`">{{ labels[meta.status] }}</span>
    </div>
    <div v-if="meta" class="report-meta">
      <span>更新：{{ formatReportTimestamp(meta.updatedAt, meta.timeZone) }} · {{ meta.timeZone }}</span>
      <span>统计范围：{{ formatReportTimestamp(meta.periodStart, meta.timeZone) }} 至 {{ formatReportTimestamp(meta.periodEnd, meta.timeZone) }}</span>
      <p v-for="(note, i) in meta.notes" :key="i">{{ note }}</p>
    </div>
    <div v-if="status === 'loading' || status === 'idle'" class="report-empty" role="status"><LoadingIcon /><span>正在查询本区数据</span></div>
    <div v-else-if="status === 'error' || status === 'unavailable'" class="report-empty" role="status">
      <strong>{{ status === 'unavailable' ? '数据未接入' : '本区数据加载失败' }}</strong>
      <p>{{ status === 'unavailable' ? '数据接入后将在此展示，当前没有可用统计。' : message }}</p>
      <button role="button" class="report-button" @click="$emit('retry')">重试</button>
    </div>
    <slot v-else />
  </section>
</template>
