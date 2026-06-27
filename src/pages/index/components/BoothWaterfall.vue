<template>
  <view class="booth-waterfall">
    <BoothCard v-for="item in boothCards" :key="item.code" :item="item" />
  </view>
</template>

<script setup lang="ts">
import BoothCard from "./BoothCard.vue"
import { boothCards } from "./boothData"
</script>

<style scoped>
.booth-waterfall {
  column-count: 1;
  column-gap: var(--space-3);
}

@media (min-width: 768px) {
  .booth-waterfall {
    column-count: 2;
  }
}

@media (min-width: 1600px) {
  .booth-waterfall {
    column-count: 3;
  }
}
</style>
