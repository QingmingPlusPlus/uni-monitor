<script setup lang="ts">
import EquipmentDetailView from '../../pages/factory-dashboard/components/EquipmentDetailView/EquipmentDetailView.vue'
import { useEquipmentDashboard } from '../../pages/factory-dashboard/composables/useEquipmentDashboard'

const { detailData, alarmItems, loadError, handleBack } = useEquipmentDashboard('pc')
</script>

<template>
  <view>
    <EquipmentDetailView
      class="pc-equipment-detail"
      :data="detailData"
      :alarms="alarmItems"
      @back="handleBack"
    />

    <view
      v-if="loadError"
      class="equipment-load-error"
    >
      {{ loadError }}
    </view>
  </view>
</template>

<style scoped>
.equipment-load-error {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 10;
  max-width: 520rpx;
  border: 1px solid var(--um-color-danger);
  border-radius: 10rpx;
  background: var(--um-color-surface);
  color: var(--um-color-danger);
  font-size: 24rpx;
  font-weight: 800;
  line-height: 1.4;
  padding: var(--space-2) var(--space-3);
}

@media (min-width: 768px) {
  .equipment-load-error {
    max-width: 420px;
    border-radius: 8px;
    font-size: 16px;
  }
}
</style>

<style scoped src="./equipment.css"></style>
