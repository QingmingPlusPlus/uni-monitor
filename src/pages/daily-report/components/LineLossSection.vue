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
</script>

<template>
  <ReportSection class="production-lines" :status="state.status" :message="state.message" @retry="$emit('retry')">
    <div class="production-table-heading"><span class="report-muted">单位：时间＝小时/日；数量＝个/日</span></div>
    <div class="production-ranking-list"><ProductionLineTable v-for="(row, index) in rows" :key="row.id" :row="row" :rank="index + 1" /></div>
  </ReportSection>
</template>
