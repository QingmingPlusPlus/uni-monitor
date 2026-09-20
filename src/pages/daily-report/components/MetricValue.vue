<script setup lang="ts">
import type { ReportMetric } from '../../../api/dailyReport'
import { formatMetric, metricValue } from '../reportModel'
defineProps<{ metric?: ReportMetric | null; hours?: boolean; suppressed?: boolean; digits?: number; plain?: boolean; blankZero?: boolean }>()
</script>

<template>
  <span class="report-metric" :title="suppressed ? '班次尚未开始或统计未完成' : metric?.note">
    <span>{{ suppressed ? '—' : blankZero && metricValue(metric) === 0 ? '' : formatMetric(metric, hours, digits) }}</span>
    <small v-if="!plain && !suppressed && metric?.status === 'partial'">未完成</small>
    <small v-else-if="!plain && !suppressed && metricValue(metric) === null">{{ metric?.status === 'complete' ? '缺失' : '未提供' }}</small>
  </span>
</template>
