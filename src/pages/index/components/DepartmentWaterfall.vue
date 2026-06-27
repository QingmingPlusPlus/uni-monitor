<template>
  <view class="department-waterfall">
    <BoothCard v-for="item in departmentCards" :key="item.code" :item="item" />
  </view>
</template>

<script setup lang="ts">
import BoothCard from "./BoothCard.vue"
import { boothCards } from "./boothData"

const departmentCards = boothCards
</script>

<style scoped>
.department-waterfall {
  column-count: 1;
  column-gap: var(--space-3);
}

@media (min-width: 768px) {
  .department-waterfall {
    column-count: 2;
  }
}

@media (min-width: 1600px) {
  .department-waterfall {
    column-count: 3;
  }
}
</style>
