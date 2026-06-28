<script setup lang="ts">
import type {
  EquipmentDetailData,
  EquipmentDetailRow,
} from '../../data/factoryDashboardTypes'
import FactoryKpiGrid from '../FactoryKpiGrid/FactoryKpiGrid.vue'

defineProps<{
  readonly data: EquipmentDetailData
}>()

const emit = defineEmits<{
  back: []
}>()

function getRowToneClass(row: EquipmentDetailRow): string {
  return row.tone ? `equipment-detail__value--${row.tone}` : ''
}
</script>

<template>
  <view class="equipment-detail">
    <view class="equipment-detail__topbar">
      <button
        class="equipment-detail__back"
        type="button"
        @click="emit('back')"
      >
        返回
      </button>
      <text class="equipment-detail__mode">显示 Mock 数据</text>
    </view>

    <view class="equipment-detail__hero">
      <view class="equipment-detail__copy">
        <text class="equipment-detail__eyebrow">{{ data.eyebrow }}</text>
        <text class="equipment-detail__title">{{ data.title }}</text>
        <text class="equipment-detail__subtitle">{{ data.subtitle }}</text>
      </view>
      <FactoryKpiGrid :items="data.kpis" />
    </view>

    <view class="equipment-detail__grid">
      <section class="equipment-detail__card equipment-detail__card--wide">
        <text class="equipment-detail__card-title">当前设备计划</text>
        <view class="equipment-detail__row-table">
          <view
            v-for="row in data.currentPlan"
            :key="row.label"
            class="equipment-detail__row"
          >
            <text>{{ row.label }}</text>
            <text :class="getRowToneClass(row)">{{ row.value }}</text>
          </view>
        </view>
      </section>

      <section class="equipment-detail__card">
        <text class="equipment-detail__card-title">停线计划展开</text>
        <view class="equipment-detail__row-table">
          <view
            v-for="row in data.downtimePlan"
            :key="row.label"
            class="equipment-detail__row"
          >
            <text>{{ row.label }}</text>
            <text :class="getRowToneClass(row)">{{ row.value }}</text>
          </view>
        </view>
      </section>

      <section class="equipment-detail__card">
        <text class="equipment-detail__card-title">损耗明细</text>
        <view class="equipment-detail__row-table">
          <view
            v-for="row in data.lossReasons"
            :key="row.label"
            class="equipment-detail__row"
          >
            <text>{{ row.label }}</text>
            <text :class="getRowToneClass(row)">{{ row.value }}</text>
          </view>
        </view>
      </section>

      <section class="equipment-detail__card">
        <text class="equipment-detail__card-title">不良明细</text>
        <view class="equipment-detail__row-table">
          <view
            v-for="row in data.defectReasons"
            :key="row.label"
            class="equipment-detail__row"
          >
            <text>{{ row.label }}</text>
            <text :class="getRowToneClass(row)">{{ row.value }}</text>
          </view>
        </view>
      </section>

      <section class="equipment-detail__card equipment-detail__card--wide">
        <text class="equipment-detail__card-title">停止时间轴</text>
        <view class="equipment-detail__timeline">
          <view
            v-for="item in data.timeline"
            :key="`${item.time}-${item.title}`"
            class="equipment-detail__timeline-item"
          >
            <text class="equipment-detail__timeline-time">{{ item.time }}</text>
            <view>
              <text class="equipment-detail__timeline-title">{{ item.title }}</text>
              <text class="equipment-detail__timeline-detail">{{ item.detail }}</text>
            </view>
          </view>
        </view>
      </section>

      <section class="equipment-detail__card">
        <text class="equipment-detail__card-title">设备人员周期</text>
        <view class="equipment-detail__row-table">
          <view
            v-for="row in data.cycleRows"
            :key="row.label"
            class="equipment-detail__row"
          >
            <text>{{ row.label }}</text>
            <text :class="getRowToneClass(row)">{{ row.value }}</text>
          </view>
        </view>
      </section>
    </view>
  </view>
</template>

<style scoped src="./EquipmentDetailView.css"></style>
