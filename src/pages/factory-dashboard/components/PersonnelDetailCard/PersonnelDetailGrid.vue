<template>
  <view :class="['personnel-detail-grid', { 'personnel-detail-grid--modal': isModal }]">
    <view class="personnel-detail-grid__table-wrap">
      <view :class="['personnel-detail-table', { 'personnel-detail-table--hide-hours': hideWorkingHours }]">
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">班次</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">工号</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">姓名</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">职务</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">工种</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">出勤情况</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">出勤状态</text>
        <text class="personnel-detail-table__cell personnel-detail-table__cell--head">能力</text>
        <text v-show="!hideWorkingHours" class="personnel-detail-table__cell personnel-detail-table__cell--head">工时</text>

        <template
          v-for="row in data.rows"
          :key="row.id"
        >
          <text :class="getCellClass(row, 'shift')">{{ row.shiftLabel }}</text>
          <text :class="getCellClass(row, 'code')">{{ row.employeeId }}</text>
          <text :class="getCellClass(row, 'name')">{{ row.name }}</text>
          <text :class="getCellClass(row, 'text')">{{ row.position }}</text>
          <text :class="getCellClass(row, 'text')">{{ row.jobType }}</text>
          <text :class="getStatusCellClass(row)">{{ row.attendanceStatusLabel }}</text>
          <text :class="getCellClass(row, 'text')">{{ row.attendanceStateLabel }}</text>
          <text :class="getCellClass(row, 'capability')">{{ row.capability }}</text>
          <text v-show="!hideWorkingHours" :class="getCellClass(row, 'hours')">{{ row.workingHours }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type {
  PersonnelDetailAttendanceStatus,
  PersonnelDetailData,
  PersonnelDetailRow,
} from '../../data/personnelDetailMock'

type DetailCellRole = 'shift' | 'code' | 'name' | 'text' | 'capability' | 'hours'

type StatusTone = 'present' | 'leave' | 'travel' | 'absent'

withDefaults(
  defineProps<{
    readonly data: PersonnelDetailData
    readonly isModal?: boolean
  }>(),
  {
    isModal: false,
  },
)

const hideWorkingHours = true

const statusToneMap: Readonly<Record<PersonnelDetailAttendanceStatus, StatusTone>> = {
  present: 'present',
  'annual-leave': 'leave',
  'sick-leave': 'leave',
  'personal-leave': 'leave',
  'business-travel': 'travel',
  absent: 'absent',
}

function getCellClass(row: PersonnelDetailRow, role: DetailCellRole): readonly (string | Readonly<Record<string, boolean>>)[] {
  return [
    'personnel-detail-table__cell',
    `personnel-detail-table__cell--${role}`,
  ]
}

function getStatusCellClass(row: PersonnelDetailRow): readonly (string | Readonly<Record<string, boolean>>)[] {
  const tone = statusToneMap[row.attendanceStatus]

  return [
    'personnel-detail-table__cell',
    'personnel-detail-table__cell--status',
    `personnel-detail-table__cell--status-${tone}`,
  ]
}
</script>

<style scoped src="./PersonnelDetailGrid.css"></style>
