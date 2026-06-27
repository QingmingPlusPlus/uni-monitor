<template>
  <view class="process-waterfall">
    <ProcessCard v-for="item in processCards" :key="item.code" :item="item" />
  </view>
</template>

<script setup lang="ts">
import ProcessCard from "./ProcessCard.vue"
import { processCards } from "./processData"
</script>

<style scoped>
.process-waterfall {
  column-count: 1;
  column-gap: var(--space-3);
}

@media (min-width: 768px) {
  .process-waterfall {
    column-count: 2;
  }
}

@media (min-width: 1600px) {
  .process-waterfall {
    column-count: 3;
  }
}
</style>
