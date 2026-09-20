<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceReport, ReportAttendanceRow } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { absenceColumns, absenceTotal, attendanceRate, attendanceRows, metricValue, weekday } from '../reportModel'
import ReportSection from './ReportSection.vue'
import MetricValue from './MetricValue.vue'
const props = defineProps<{ state: SectionState<AttendanceReport>; date: string }>()
defineEmits<{ retry: [] }>()
const groups = computed(() => {
  const grouped = new Map<string, ReportAttendanceRow[]>()
  for (const row of attendanceRows(props.state.data?.rows ?? [], props.date)) {
    const group = grouped.get(row.date) ?? []
    group.push(row)
    grouped.set(row.date, group)
  }
  return [...grouped].map(([date, rows]) => ({ date, rows }))
})
const leaders = computed(() => props.state.data?.monitorNames ?? [])
function dateLabel(date: string) { return `${date.slice(2, 4)}年${date.slice(5, 7)}月${date.slice(8, 10)}日` }
</script>

<template>
  <ReportSection class="report-attendance-section" title="1. 出勤实绩" :status="state.status" :message="state.message" @retry="$emit('retry')">
    <div class="attendance-leaders"><h3>1-1. 出勤班长</h3><strong v-for="(name, index) in leaders" :key="`${index}:${name}`" class="attendance-leader-name">{{ name }}</strong></div>
    <h3 class="attendance-subtitle">1-2. 直接人员出勤</h3>
    <div class="report-table-scroll attendance-table-wrap" tabindex="0" aria-label="直接人员出勤表，可横向滚动">
      <table class="report-table report-attendance-table">
        <thead><tr><th colspan="3" scope="colgroup">班次</th><th scope="col">在籍人员</th><th scope="col">实绩出勤</th><th scope="col">出勤率</th><th scope="col">缺勤</th><th v-for="column in absenceColumns" :key="column.key" scope="col">{{ column.label }}</th></tr></thead>
        <tbody v-for="group in groups" :key="group.date">
          <tr v-for="(row, index) in group.rows" :key="row.id" :class="{ 'attendance-next-day': group.date !== date }">
            <th v-if="index === 0" :rowspan="group.rows.length" scope="rowgroup" class="attendance-date attendance-main">{{ dateLabel(group.date) }}</th>
            <td v-if="index === 0" :rowspan="group.rows.length" class="attendance-weekday attendance-main">周{{ weekday(group.date) }}</td>
            <th scope="row" class="attendance-shift attendance-main">{{ row.shiftName }}</th>
            <td class="attendance-main"><MetricValue :metric="row.roster" plain /></td>
            <td class="attendance-main"><MetricValue :metric="row.actual" :suppressed="row.status === 'not_started'" plain /></td>
            <td class="attendance-main">{{ attendanceRate(row) }}</td>
            <td class="attendance-main" :class="{ 'attendance-absent': (metricValue(absenceTotal(row)) ?? 0) > 0 }"><MetricValue :metric="absenceTotal(row)" :suppressed="row.status !== 'complete' && row.status !== 'reported'" plain /></td>
            <td v-for="column in absenceColumns" :key="column.key"><MetricValue :metric="row.absence[column.key]" :digits="2" :suppressed="row.status !== 'complete' && row.status !== 'reported'" plain blank-zero /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </ReportSection>
</template>
