<template>
  <view :class="['personnel-attendance-grid', { 'personnel-attendance-grid--modal': isModal }]">
    <view class="personnel-attendance-grid__table-wrap">
      <view class="personnel-attendance-table">
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--process-head">工序</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--shift-head">班次</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--roster-head">间接+直接在籍</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--indirect-head">间接</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--direct-head">直接</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--indirect-roster">在籍</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--indirect-attendance">出勤</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--direct-roster">在籍</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head personnel-attendance-table__cell--actual-attendance">实际出勤</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">班长</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">班长</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">组长</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">正式工</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">派遣工</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">临时工</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">顶岗</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">合计</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">人数</text>
        <text class="personnel-attendance-table__cell personnel-attendance-table__cell--head">出勤率</text>

        <template
          v-for="item in rows"
          :key="item.id"
        >
          <text :class="getCellClass(item, 'group')">{{ item.showGroupLabel ? item.groupLabel : '' }}</text>
          <text :class="getCellClass(item, 'shift')">{{ item.row.shiftLabel }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.indirectDirectRoster) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.indirectLeaderRoster) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.indirectLeaderAttendance) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.directTeamLeader) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.directRegular) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.directDispatched) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.directTemporary) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.directStandby) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.directRosterTotal) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatCount(item.row.actualAttendance) }}</text>
          <text :class="getCellClass(item, 'metric')">{{ formatRate(item.row.attendanceRate) }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  PersonnelAttendanceData,
  PersonnelAttendanceProcessGroup,
  PersonnelAttendanceRow,
} from '../../data/factoryDashboardTypes'

type AttendanceDisplayRow = {
  readonly id: string
  readonly groupLabel: string
  readonly row: PersonnelAttendanceRow
  readonly showGroupLabel: boolean
  readonly isDepartmentTotal: boolean
}

type AttendanceCellRole = 'group' | 'shift' | 'metric'

const props = withDefaults(
  defineProps<{
    readonly data: PersonnelAttendanceData
    readonly isModal?: boolean
  }>(),
  {
    isModal: false,
  },
)

const rows = computed(() =>
  props.data.groups.flatMap((group) => createDisplayRows(group)),
)

function createDisplayRows(group: PersonnelAttendanceProcessGroup): readonly AttendanceDisplayRow[] {
  const isDepartmentTotal = group.label.endsWith('全体')

  return group.rows.map((row, index) => ({
    id: `${group.id}-${row.id}`,
    groupLabel: group.label,
    row,
    showGroupLabel: index === 0,
    isDepartmentTotal,
  }))
}

function formatCount(value: number | null): string {
  return value === null ? '-' : String(value)
}

function formatRate(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)}%`
}

function getCellClass(
  item: AttendanceDisplayRow,
  role: AttendanceCellRole,
): readonly (string | Readonly<Record<string, boolean>>)[] {
  return [
    'personnel-attendance-table__cell',
    `personnel-attendance-table__cell--${role}`,
    {
      'personnel-attendance-table__cell--total': item.row.shift === 'total',
      'personnel-attendance-table__cell--department-total': item.isDepartmentTotal,
    },
  ]
}
</script>

<style scoped src="./PersonnelAttendanceGrid.css"></style>
