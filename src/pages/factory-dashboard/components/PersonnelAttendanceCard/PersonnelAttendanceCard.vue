<template>
  <view class="personnel-attendance-card">
    <view class="personnel-attendance-card__head">
      <view class="personnel-attendance-card__title-group">
        <text class="personnel-attendance-card__title">{{ data.title }}</text>
        <text class="personnel-attendance-card__subtitle">
          {{ data.subtitle }} · {{ data.refreshedAt }} 更新
        </text>
      </view>

      <view class="personnel-attendance-card__actions">
        <button
          class="personnel-attendance-card__action"
          type="button"
          aria-label="刷新人员出勤"
          @click="emit('refresh')"
        >
          <svg class="personnel-attendance-card__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.45 5.08h-2.13A6 6 0 1 1 12 6a5.96 5.96 0 0 1 4.24 1.76L13 11h8V3l-3.35 3.35Z" />
          </svg>
        </button>
        <button
          class="personnel-attendance-card__action"
          type="button"
          aria-label="展开人员出勤"
          @click="handleExpand"
        >
          <svg class="personnel-attendance-card__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h6v2H8.41l3.3 3.29-1.42 1.42L7 8.41V11H5V5Zm8 0h6v6h-2V8.41l-3.29 3.3-1.42-1.42L15.59 7H13V5Zm4 10.59V13h2v6h-6v-2h2.59l-3.3-3.29 1.42-1.42L17 15.59ZM8.41 17H11v2H5v-6h2v2.59l3.29-3.3 1.42 1.42L8.41 17Z" />
          </svg>
        </button>
      </view>
    </view>

    <PersonnelAttendanceGrid :data="data" />

    <DashboardExpandMockModal
      v-if="isExpanded"
      :title="data.title"
      :subtitle="`${data.subtitle} · ${data.refreshedAt} 更新`"
      @close="handleCloseExpanded"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PersonnelAttendanceData } from '../../data/factoryDashboardTypes'
import DashboardExpandMockModal from '../DashboardExpandMockModal/DashboardExpandMockModal.vue'
import PersonnelAttendanceGrid from './PersonnelAttendanceGrid.vue'

defineProps<{
  readonly data: PersonnelAttendanceData
}>()

const emit = defineEmits<{
  refresh: []
}>()

const isExpanded = ref(false)

function handleExpand(): void {
  isExpanded.value = true
}

function handleCloseExpanded(): void {
  isExpanded.value = false
}
</script>

<style scoped src="./PersonnelAttendanceCard.css"></style>
