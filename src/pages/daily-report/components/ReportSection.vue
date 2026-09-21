<script setup lang="ts">
import type { ReportMeta } from '../../../api/dailyReport'
import type { SectionStatus } from '../reportResource'
import LoadingIcon from '../../../components/LoadingIcon.vue'
import { formatReportTimestamp } from '../reportModel'
defineProps<{ title?: string; subtitle?: string; status: SectionStatus; meta?: ReportMeta; message?: string }>()
defineEmits<{ retry: [] }>()
const labels = { complete: '数据完整', partial: '部分数据可用', unavailable: '数据未接入' }
</script>

<template>
  <section class="report-section" :aria-busy="status === 'loading'">
    <div v-if="title || subtitle || meta" class="report-section-heading">
      <div v-if="title || subtitle"><h2 v-if="title">{{ title }}</h2><p v-if="subtitle" class="report-muted">{{ subtitle }}</p></div>
      <div v-if="meta" class="report-section-actions"><span class="report-badge" :class="`report-badge--${meta.status}`">{{ labels[meta.status] }}</span><button role="button" v-if="status === 'ready' && meta.status === 'partial'" class="report-text-button" @click="$emit('retry')">重新读取</button></div>
    </div>
    <div v-if="meta" class="report-meta">
      <span>{{ meta.timestampSource === 'retrieved' ? '读取时间' : '更新' }}：{{ formatReportTimestamp(meta.updatedAt, meta.timeZone) }} · {{ meta.timeZone }}</span>
      <span v-if="meta.periodStart && meta.periodEnd">统计范围：{{ formatReportTimestamp(meta.periodStart, meta.timeZone) }} 至 {{ formatReportTimestamp(meta.periodEnd, meta.timeZone) }}</span>
      <span v-else>数据归属日：{{ meta.date }} · 未提供具体统计起止时刻</span>
      <p v-for="(note, i) in meta.notes" :key="i">{{ note }}</p>
    </div>
    <div v-if="status === 'loading' || status === 'idle'" class="report-empty" role="status"><LoadingIcon /><span>正在查询本区数据</span></div>
    <div v-else-if="status === 'error' || status === 'unavailable'" class="report-empty" role="status">
      <strong>{{ status === 'unavailable' ? '数据未接入' : '本区数据加载失败' }}</strong>
      <p>{{ message || '当前没有可用统计，请稍后重试。' }}</p>
      <button role="button" class="report-button" @click="$emit('retry')">重试</button>
    </div>
    <slot v-else />
    <slot name="after" />
  </section>
</template>
