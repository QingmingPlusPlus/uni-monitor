<template>
  <view class="table-chart-card">
    <view class="table-chart-card__head">
      <view class="table-chart-card__title-group">
        <text v-if="tag" class="table-chart-card__tag">{{ tag }}</text>
        <text class="table-chart-card__title">{{ title }}</text>
        <text v-if="subtitle" class="table-chart-card__subtitle">{{ subtitle }}</text>
      </view>
      <button
        class="table-chart-card__expand"
        type="button"
        aria-label="展开图表"
        @click="handleExpand"
      >
        <svg
          class="table-chart-card__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M5 5h6v2H8.41l3.3 3.29-1.42 1.42L7 8.41V11H5V5Zm8 0h6v6h-2V8.41l-3.29 3.3-1.42-1.42L15.59 7H13V5Zm4 10.59V13h2v6h-6v-2h2.59l-3.3-3.29 1.42-1.42L17 15.59ZM8.41 17H11v2H5v-6h2v2.59l3.29-3.3 1.42 1.42L8.41 17Z"
          />
        </svg>
      </button>
    </view>

    <TableChartCardTable
      :table-rows="tableRows"
      :table-columns="tableColumns"
      :table-data="tableData"
      :table-grid-style="tableGridStyle"
    />

    <view class="table-chart-card__chart-area">
      <UniEcharts
        v-if="hasChartData"
        ref="inlineChartRef"
        class="table-chart-card__chart"
        :option="resolvedChartOptions"
        :init-options="chartInitOptions"
        :update-options="chartUpdateOptions"
        :autoresize="chartAutoResize"
        :support-hover="true"
        @inited="handleChartInited"
      />
      <view v-else class="table-chart-card__empty table-chart-card__empty--chart">
        <text>暂无图表数据</text>
      </view>
    </view>

    <view
      v-if="isExpanded"
      class="table-chart-card__modal-layer"
      role="dialog"
      aria-modal="true"
      @click="handleCloseExpanded"
    >
      <view class="table-chart-card__modal" @click.stop>
        <view class="table-chart-card__modal-head">
          <view class="table-chart-card__modal-title-group">
            <text v-if="tag" class="table-chart-card__tag">{{ tag }}</text>
            <text class="table-chart-card__modal-title">{{ title }}</text>
            <text v-if="subtitle" class="table-chart-card__modal-subtitle">
              {{ subtitle }}
            </text>
          </view>
          <button
            class="table-chart-card__modal-close"
            type="button"
            aria-label="收起图表"
            @click="handleCloseExpanded"
          >
            <svg
              class="table-chart-card__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M5 16h3v3h2v-5H5v2Zm3-8H5v2h5V5H8v3Zm6 11h2v-3h3v-2h-5v5Zm2-11V5h-2v5h5V8h-3Z"
              />
            </svg>
          </button>
        </view>

        <view class="table-chart-card__modal-body">
          <TableChartCardTable
            :table-rows="tableRows"
            :table-columns="tableColumns"
            :table-data="tableData"
            :table-grid-style="tableGridStyle"
            is-modal
          />

          <view class="table-chart-card__chart-area table-chart-card__chart-area--modal">
            <UniEcharts
              v-if="hasChartData"
              ref="modalChartRef"
              class="table-chart-card__chart table-chart-card__chart--modal"
              :option="resolvedChartOptions"
              :init-options="chartInitOptions"
              :update-options="chartUpdateOptions"
              :autoresize="chartAutoResize"
              :support-hover="true"
              @inited="handleChartInited"
            />
            <view v-else class="table-chart-card__empty table-chart-card__empty--chart">
              <text>暂无图表数据</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import * as echarts from "echarts"
import type { SetOptionOpts } from "echarts"
import UniEcharts from "uni-echarts"
import { provideEcharts } from "uni-echarts/shared"
import { computed, nextTick, onMounted, ref, watch } from "vue"
import TableChartCardTable from "./TableChartCardTable.vue"
import {
  hasRenderableChartData,
  resolveChartOptions,
} from "./TableChartCard.logic"
import type {
  ChartDataConfig,
  ChartOptionConfig,
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "./TableChartCard.types"

provideEcharts(echarts)

const props = withDefaults(
  defineProps<{
    readonly title: string
    readonly subtitle?: string
    readonly tag?: string
    readonly tableRows: readonly TableRowConfig[]
    readonly tableColumns: readonly TableColumnConfig[]
    readonly tableData: TableData
    readonly chartOptions: ChartOptionConfig
    readonly chartData?: ChartDataConfig
  }>(),
  {
    subtitle: "",
    tag: "",
    chartData: undefined,
  },
)

const hasChartData = computed(() => hasRenderableChartData(props.chartData))

type ChartResizeHandle = {
  readonly resize: () => void | Promise<void>
}

const tableGridStyle = computed(() => {
  const columnTracks = props.tableColumns
    .map((column) => column.width ?? "minmax(132px, 1fr)")
    .join(" ")

  return {
    gridTemplateColumns: `minmax(156px, 188px) ${columnTracks}`,
  }
})

const resolvedChartOptions = computed(() => resolveChartOptions(props.chartOptions, props.chartData))
const inlineChartRef = ref<ChartResizeHandle | null>(null)
const modalChartRef = ref<ChartResizeHandle | null>(null)
const isExpanded = ref(false)

const chartUpdateOptions: SetOptionOpts = {
  replaceMerge: ["xAxis", "dataset", "series"],
  lazyUpdate: false,
}

const chartInitOptions = {
  renderer: "canvas",
} as const

const chartAutoResize = {
  throttle: 120,
}

const resizeOneChart = async (chart: ChartResizeHandle | null): Promise<void> => {
  if (chart === null) {
    return
  }

  await Promise.resolve(chart.resize())
}

const resizeCharts = async (): Promise<void> => {
  await nextTick()
  await Promise.all([
    resizeOneChart(inlineChartRef.value),
    resizeOneChart(modalChartRef.value),
  ])
}

const handleResizeError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[TableChartCard] ECharts resize failed: ${message}`)
}

const runChartResize = (): void => {
  resizeCharts().catch(handleResizeError)
}

const scheduleChartResize = (): void => {
  runChartResize()
  globalThis.setTimeout(runChartResize, 80)
  globalThis.setTimeout(runChartResize, 240)
}

const handleExpand = (): void => {
  isExpanded.value = true
  scheduleChartResize()
}

const handleCloseExpanded = (): void => {
  isExpanded.value = false
  scheduleChartResize()
}

const handleChartInited = (): void => {
  scheduleChartResize()
}

onMounted(scheduleChartResize)
watch(resolvedChartOptions, scheduleChartResize, { flush: "post" })
watch(hasChartData, scheduleChartResize, { flush: "post" })
watch(isExpanded, scheduleChartResize, { flush: "post" })
</script>

<style scoped src="./TableChartCard.css"></style>
<style scoped src="./TableChartCard.modal.css"></style>
