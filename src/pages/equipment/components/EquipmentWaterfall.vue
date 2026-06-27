<template>
  <view class="equipment-waterfall">
    <EquipmentPlaceholderCard
      v-for="item in equipmentCards"
      :key="item.code"
      :item="item"
    />
  </view>
</template>

<script setup lang="ts">
import EquipmentPlaceholderCard from "./EquipmentPlaceholderCard.vue"
import { equipmentCards } from "../equipmentData"
</script>

<style scoped>
.equipment-waterfall {
  width: 100%;
  column-count: 1;
  column-gap: var(--space-3);
}
</style>
