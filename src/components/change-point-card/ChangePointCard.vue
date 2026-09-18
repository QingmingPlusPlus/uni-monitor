<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import LoadingIcon from '../LoadingIcon.vue'
import ChangePointContent from './ChangePointContent.vue'
import type { ChangePointData } from '../../pages/factory-dashboard/data/loaders/loadChangePointCard'
const props = defineProps<{ data: ChangePointData; scope: string }>()
const emit = defineEmits<{ refresh: [] }>()
const expanded = ref(false)
const filters = ref({ startDate: '', endDate: '', shift: '', state: '' })
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') expanded.value = false
}
watch(expanded, value => {
  if (typeof window === 'undefined') return
  if (value) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})
watch(() => props.scope, () => { expanded.value = false; filters.value = { startDate: '', endDate: '', shift: '', state: '' } })
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <view class="change-point-card">
    <view class="change-point-card__header">
      <view>
        <text class="change-point-card__title">变化点管理</text>
        <text class="change-point-card__subtitle">{{ scope }} · 变化点明细</text>
      </view>
      <view class="change-point-card__actions">
        <button :disabled="data.status === 'loading'" aria-label="刷新变化点管理" @click="emit('refresh')"><svg class="change-point-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.45 5.08h-2.13A6 6 0 1 1 12 6a5.96 5.96 0 0 1 4.24 1.76L13 11h8V3l-3.35 3.35Z" /></svg></button>
        <button aria-label="展开变化点管理" @click="expanded = true"><svg class="change-point-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h6v2H8.41l3.3 3.29-1.42 1.42L7 8.41V11H5V5Zm8 0h6v6h-2V8.41l-3.29 3.3-1.42-1.42L15.59 7H13V5Zm4 10.59V13h2v6h-6v-2h2.59l-3.3-3.29 1.42-1.42L17 15.59ZM8.41 17H11v2H5v-6h2v2.59l3.29-3.3 1.42 1.42L8.41 17Z" /></svg></button>
      </view>
    </view>
    <view v-if="data.status === 'loading'" class="change-point-card__loading"><LoadingIcon /><text>变化点加载中</text></view>
    <view v-if="data.message" class="change-point-card__message" role="status">{{ data.message }}</view>
    <ChangePointContent v-if="data.status !== 'loading'" :data="data" v-model:filters="filters" />
    <view v-if="expanded" class="change-point-card__overlay" role="dialog" aria-modal="true" aria-label="变化点明细详情" @click.self="expanded = false">
      <view class="change-point-card__modal">
        <view class="change-point-card__header">
          <view><text class="change-point-card__title">变化点管理</text><text class="change-point-card__subtitle">{{ scope }} · 变化点明细</text></view>
          <button aria-label="关闭变化点管理" @click="expanded = false"><svg class="change-point-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2Zm3-8H5v2h5V5H8v3Zm6 11h2v-3h3v-2h-5v5Zm2-11V5h-2v5h5V8h-3Z" /></svg></button>
        </view>
        <view v-if="data.message" class="change-point-card__message" role="status">{{ data.message }}</view>
        <view v-if="data.status === 'loading'" class="change-point-card__loading"><LoadingIcon /></view>
        <ChangePointContent v-else :data="data" v-model:filters="filters" expanded />
      </view>
    </view>
  </view>
</template>

<style scoped>
.change-point-card { min-width: 0; padding: 20px; border: 1px solid var(--um-color-border); border-radius: 16px; color: var(--um-color-text-primary); background: var(--um-color-surface); }
.change-point-card__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.change-point-card__title { display: block; font-size: 26px; font-weight: 700; }
.change-point-card__subtitle { display: block; margin-top: 6px; font-size: 15px; color: var(--um-color-text-secondary); }
.change-point-card__actions { display: flex; gap: 8px; }
.change-point-card button { display: flex; margin: 0; width: 44px; height: 44px; flex-shrink: 0; align-items: center; justify-content: center; padding: 0; line-height: 1; color: var(--um-color-text-secondary); background: var(--um-color-surface); border: 1px solid var(--um-color-border); border-radius: 8px; }
.change-point-card button:active { opacity: .75; transform: translateY(1px); }
.change-point-card__icon { display: block; width: 24px; height: 24px; fill: currentcolor; }
.change-point-card button::after { border: 0; }
.change-point-card button[disabled] { opacity: .5; }
.change-point-card__loading { min-height: 380px; display: flex; align-items: center; justify-content: center; gap: 12px; }
.change-point-card__message { padding: 12px; margin-bottom: 16px; border-radius: 8px; background: var(--um-color-surface-subtle); color: var(--um-color-text-secondary); font-size: 15px; }
.change-point-card__overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(16, 24, 32, .5); }
.change-point-card__modal { width: 92vw; max-height: 90vh; overflow: auto; padding: 24px; border-radius: 16px; box-sizing: border-box; background: var(--um-color-surface); }
</style>
