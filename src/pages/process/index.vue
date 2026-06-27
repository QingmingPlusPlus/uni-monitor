<template>
  <view class="home-page">
    <HomeHeader />
    <DimensionSwitcher active="process" />
    <HomeContent dimension="process" />
  </view>
</template>

<script setup lang="ts">
import DimensionSwitcher from "../index/components/DimensionSwitcher.vue"
import HomeContent from "../index/components/HomeContent.vue"
import HomeHeader from "../index/components/HomeHeader.vue"
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--space-3);
  background: var(--um-color-page);
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .home-page {
    max-width: 100%;
    margin: 0 auto;
    padding: var(--space-4);
  }
}

@media (min-width: 1920px) {
  .home-page {
    height: 100vh;
    height: 100dvh;
    gap: var(--space-2);
    overflow: hidden;
    padding: var(--space-4);
  }
}
</style>
