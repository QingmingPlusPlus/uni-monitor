<template>
  <view class="dimension-switcher">
    <view
      v-for="item in items"
      :key="item.key"
      :class="[
        'dimension-switcher__item',
        { 'dimension-switcher__item--active': active === item.key },
      ]"
      @click="navigate(item)"
    >
      <text class="dimension-switcher__text">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
type DimensionKey = "department" | "process" | "equipment"

const props = defineProps<{
  readonly active: DimensionKey
}>()

const items: { readonly key: DimensionKey; readonly label: string; readonly url: string }[] = [
  { key: "department", label: "部门维度", url: "/pages/department/index" },
  { key: "process", label: "工序维度", url: "/pages/process/index" },
  { key: "equipment", label: "设备维度", url: "/pages/equipment/index" },
]

function navigate(item: { readonly key: DimensionKey; readonly url: string }) {
  if (item.key === props.active) return
  uni.navigateTo({ url: item.url })
}
</script>

<style scoped>
.dimension-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 18rpx;
  background: var(--um-color-surface);
}

.dimension-switcher__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--um-color-border);
  border-radius: 12rpx;
  background: var(--um-color-surface-subtle);
  cursor: pointer;
  transition: background 0.15s ease;
}

.dimension-switcher__item--active {
  border-color: var(--um-color-accent);
  background: var(--um-color-accent-soft);
}

.dimension-switcher__text {
  color: var(--um-color-text-primary);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .dimension-switcher {
    border-radius: 16px;
  }

  .dimension-switcher__item {
    padding: 10px 18px;
    border-radius: 10px;
  }

  .dimension-switcher__text {
    font-size: 14px;
  }
}
</style>
