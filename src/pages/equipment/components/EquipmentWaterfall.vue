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
  column-count: 1;
  column-gap: var(--space-3);
}

@media (min-width: 768px) {
  .equipment-waterfall {
    column-count: 2;
  }
}

@media (min-width: 1280px) {
  .equipment-waterfall {
    column-count: 3;
  }
}

@media (min-width: 1920px) {
  .equipment-waterfall {
    column-count: 4;
  }
}
</style>
