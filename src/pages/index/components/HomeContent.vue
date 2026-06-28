<template>
  <view class="home-content">
    <view class="home-content__block">
      <view class="home-content__stage">
        <TableChartCard
          v-if="dimension === 'process'"
          title="入库计划实绩"
          subtitle="入库计划、入库实绩、差异和达成率"
          tag="Mock 数据"
          :table-rows="tableChartMockRows"
          :table-columns="tableChartMockColumns"
          :table-data="tableChartMockData"
          :chart-options="tableChartMockOptions"
          :chart-data="tableChartMockChartData"
        />
        <StagePlaceholder v-else />
      </view>
      <view class="home-content__waterfall">
        <view class="home-content__waterfall-head">
          <text class="home-content__title">{{ waterfallTitle }}</text>
          <text class="home-content__note">{{ waterfallNote }}</text>
        </view>
        <scroll-view
          class="home-content__waterfall-scroll"
          scroll-y
          :show-scrollbar="true"
        >
          <DepartmentWaterfall v-if="dimension === 'department'" />
          <ProcessWaterfall v-else />
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue"
import TableChartCard from "../../../components/TableChartCard.vue"
import {
  tableChartMockChartData,
  tableChartMockColumns,
  tableChartMockData,
  tableChartMockOptions,
  tableChartMockRows,
} from "../../../components/tableChartCardMock"
import DepartmentWaterfall from "./DepartmentWaterfall.vue"
import ProcessWaterfall from "../../process/ProcessWaterfall.vue"
import StagePlaceholder from "./StagePlaceholder.vue"

const props = withDefaults(
  defineProps<{
    readonly dimension?: "department" | "process"
  }>(),
  { dimension: "department" },
)

const waterfallTitle = computed(() =>
  props.dimension === "process" ? "工序瀑布流" : "部门瀑布流",
)

const waterfallNote = computed(() =>
  props.dimension === "process"
    ? "各工序的运行状态、节拍与质量情况"
    : "各部门的重点、开放、维护与空闲状态统一呈现",
)
</script>

<style scoped>
.home-content {
  display: flex;
  min-height: 0;
  flex: 1;
}

.home-content__block {
  display: grid;
  width: 100%;
  min-height: 0;
  flex: 1;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--um-color-border);
  border-radius: 20rpx;
  background: var(--um-color-surface);
  box-sizing: border-box;
}

.home-content__stage {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.home-content__waterfall {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: var(--space-3);
  overflow: hidden;
}

.home-content__waterfall-head {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--um-color-rail);
}

.home-content__waterfall-scroll {
  display: flex;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.home-content__title {
  color: var(--um-color-text-primary);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.3;
}

.home-content__note {
  color: var(--um-color-text-secondary);
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.45;
}

@media (min-width: 768px) {
  .home-content__block {
    border-radius: 16px;
  }

  .home-content__title {
    font-size: 20px;
  }

  .home-content__note {
    font-size: 14px;
  }
}

@media (min-width: 1024px) {
  .home-content__block {
    grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.08fr);
  }
}

@media (min-width: 1920px) {
  .home-content__block {
    grid-template-columns: minmax(720px, 0.84fr) minmax(0, 1.16fr);
    gap: var(--space-5);
  }
}
</style>
