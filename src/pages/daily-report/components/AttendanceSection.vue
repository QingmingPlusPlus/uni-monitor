<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceReport } from '../../../api/dailyReport'
import type { SectionState } from '../reportResource'
import { absenceColumns, absenceTotal, attendanceIssues, attendanceRate, attendanceRows, weekday } from '../reportModel'
import MetricValue from './MetricValue.vue'
import ReportSection from './ReportSection.vue'
const props = defineProps<{ state: SectionState<AttendanceReport>; date: string }>()
defineEmits<{ retry: [] }>()
const rows = computed(() => attendanceRows(props.state.data?.rows ?? [], props.date))
const statusLabels = { not_started: '未开始', in_progress: '统计中', complete: '已完成' }
</script>

<template>
  <ReportSection title="1. 出勤实绩" subtitle="在籍口径：当班直接排班人数，班长单列、不计入直接人员。包含数据日各班次及报告日早班。" :status="state.status" :meta="state.data?.meta" :message="state.message" @retry="$emit('retry')">
    <div v-if="!rows.length" class="report-empty">所选日期暂无出勤记录</div>
    <template v-else>
      <div class="report-leaders">
        <strong>出勤班长</strong>
        <div v-for="row in rows" :key="row.id" class="report-leader">
          <span class="report-muted">{{ row.date }} · {{ row.shiftName }}</span>
          <strong>{{ row.status === 'not_started' ? '未开始' : row.leaders === null ? '— 未接入' : row.leaders.map(leader => leader.name).join('、') || '无' }}</strong>
        </div>
      </div>
      <template v-for="row in rows" :key="`${row.id}-issues`"><p v-for="issue in attendanceIssues(row)" :key="issue" class="report-warning">{{ row.date }} {{ row.shiftName }}：{{ issue }}</p></template>
      <div class="report-table-scroll" tabindex="0" aria-label="直接人员出勤表，可横向滚动">
        <table class="report-table report-attendance-table">
          <thead><tr><th>日期</th><th>星期</th><th>班次</th><th>在籍人员</th><th>实绩出勤</th><th>出勤率</th><th>缺勤</th><th v-for="column in absenceColumns" :key="column.key">{{ column.label }}</th></tr></thead>
          <tbody><tr v-for="row in rows" :key="row.id">
            <th>{{ row.date }}</th><td>{{ weekday(row.date) }}</td>
            <td>{{ row.shiftName }}<small class="report-cell-note">{{ statusLabels[row.status] }}</small></td>
            <td><MetricValue :metric="row.roster" /></td>
            <td><MetricValue :metric="row.actual" :suppressed="row.status === 'not_started'" /></td>
            <td>{{ attendanceRate(row) }}</td>
            <td><MetricValue :metric="absenceTotal(row)" :suppressed="row.status !== 'complete'" /></td>
            <td v-for="column in absenceColumns" :key="column.key"><MetricValue :metric="row.absence[column.key]" :suppressed="row.status !== 'complete'" /></td>
          </tr></tbody>
        </table>
      </div>
    </template>
  </ReportSection>
</template>
