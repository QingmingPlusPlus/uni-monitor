<script setup lang="ts">
import type { ReportMetric } from '../../../api/dailyReport'
import { formatMetric, metricValue } from '../reportModel'
defineProps<{ metric?: ReportMetric | null; hours?: boolean; suppressed?: boolean }>()
</script>

<template>
  <span class="report-metric" :title="suppressed ? '班次尚未开始或统计未完成' : metric?.note">
    <span>{{ suppressed ? '—' : formatMetric(metric, hours) }}</span>
    <small v-if="!suppressed && metric?.status === 'partial'">未完成</small>
    <small v-else-if="!suppressed && metricValue(metric) === null">{{ metric?.status === 'complete' ? '缺失' : '未接入' }}</small>
  </span>
</template>
