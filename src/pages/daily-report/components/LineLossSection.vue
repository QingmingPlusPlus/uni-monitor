<script setup lang="ts">
import { computed } from 'vue'
import type { LineLossReport } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { rankLines } from '../reportModel'
import ReportSection from './ReportSection.vue'
import ProductionLineTable from './ProductionLineTable.vue'
const props = defineProps<{ state: SectionState<LineLossReport> }>()
defineEmits<{ retry: [] }>()
const rows = computed(() => rankLines(props.state.data?.rows ?? []))
const deviceMode = computed(() => props.state.data?.meta.lineDimension !== 'line')
</script>

<template>
  <ReportSection class="production-lines" :title="deviceMode ? '达成率最差设备（90%以下）' : '达成率最差生产线（90%以下）'" :status="state.status" :message="state.message" @retry="$emit('retry')">
    <div class="production-table-heading"><span class="report-muted">单位：时间＝小时/日；数量＝个/日</span></div>
    <div class="production-ranking-list"><ProductionLineTable v-for="(row, index) in rows" :key="row.id" :row="row" :rank="index + 1" :device-mode="deviceMode" /></div>
  </ReportSection>
</template>
