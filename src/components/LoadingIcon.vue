<template>
  <div class="loading-icon" role="status" aria-label="加载中">
    <span class="loading-icon__spinner" />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件：分段配置未返回时由消费方渲染此组件
</script>

<style scoped>
.loading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 120px;
}

.loading-icon__spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 3px solid var(--um-color-rail);
  border-top-color: var(--um-color-operation);
  border-radius: 50%;
  animation: loading-icon-spin 0.8s linear infinite;
}

@keyframes loading-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
