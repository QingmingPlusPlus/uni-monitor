<template>
  <view class="table-chart-card">
    <view class="table-chart-card__head">
      <view class="table-chart-card__title-group">
        <text class="table-chart-card__title">{{ title }}<text v-if="titleMarker" class="table-chart-card__title-marker">{{ titleMarker }}</text></text>
        <text v-if="subtitle" class="table-chart-card__subtitle">{{ subtitle }}</text>
      </view>
      <view class="table-chart-card__actions">
        <button
          class="table-chart-card__action"
          type="button"
          aria-label="刷新卡片"
          @click="handleRefresh"
        >
          <svg
            class="table-chart-card__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.45 5.08h-2.13A6 6 0 1 1 12 6a5.96 5.96 0 0 1 4.24 1.76L13 11h8V3l-3.35 3.35Z"
            />
          </svg>
        </button>
        <button
          class="table-chart-card__action"
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
    </view>

    <TableChartCardTable
      :table-rows="tableRows"
      :table-columns="tableColumns"
      :table-data="tableData"
      :table-grid-style="tableGridStyle"
      :compact="compact"
    />

    <view class="table-chart-card__chart-area">
      <TableChartEchart
        v-if="hasChartData"
        ref="inlineChartRef"
        class="table-chart-card__chart"
        :option="resolvedChartOptions"
        :init-options="chartInitOptions"
        :update-options="chartUpdateOptions"
        @inited="handleChartInited"
      />
      <view v-else class="table-chart-card__empty table-chart-card__empty--chart">
        <text>暂无图表数据</text>
      </view>
    </view>

    <DashboardExpandMockModal
      v-if="isExpanded && useMockExpand"
      :title="title"
      :subtitle="subtitle"
      @close="handleCloseExpanded"
    />

    <view
      v-else-if="isExpanded"
      class="table-chart-card__modal-layer"
      role="dialog"
      aria-modal="true"
      @click="handleCloseExpanded"
    >
      <view class="table-chart-card__modal" @click.stop>
        <view class="table-chart-card__modal-head">
          <view class="table-chart-card__modal-title-group">
            <text class="table-chart-card__modal-title">{{ title }}<text v-if="titleMarker" class="table-chart-card__title-marker">{{ titleMarker }}</text></text>
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
            :compact="compact"
            is-modal
          />

          <view class="table-chart-card__chart-area table-chart-card__chart-area--modal">
            <TableChartEchart
              v-if="hasChartData"
              ref="modalChartRef"
              class="table-chart-card__chart table-chart-card__chart--modal"
              :option="resolvedChartOptions"
              :init-options="chartInitOptions"
              :update-options="chartUpdateOptions"
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
import type { SetOptionOpts } from "echarts"
import { computed, nextTick, onMounted, ref, watch } from "vue"
import TableChartEchart from "./TableChartEchart.vue"
import TableChartCardTable from "./TableChartCardTable.vue"
import DashboardExpandMockModal from "../../pages/factory-dashboard/components/DashboardExpandMockModal/DashboardExpandMockModal.vue"
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

const props = withDefaults(
  defineProps<{
    readonly title: string
    readonly subtitle?: string
    readonly tag?: string
    readonly compact?: boolean
    readonly useMockExpand?: boolean
    readonly tableRows: readonly TableRowConfig[]
    readonly tableColumns: readonly TableColumnConfig[]
    readonly tableData: TableData
    readonly chartOptions: ChartOptionConfig
    readonly chartData?: ChartDataConfig
  }>(),
  {
    subtitle: "",
    tag: "",
    compact: false,
    useMockExpand: false,
    chartData: undefined,
  },
)

const emit = defineEmits<{
  refresh: []
}>()

const hasChartData = computed(() => hasRenderableChartData(props.chartData))
const titleMarker = computed(() => {
  const trimmedTag = props.tag.trim()

  if (trimmedTag === '' || props.title.includes('（mock）')) {
    return ''
  }

  const markerText = trimmedTag.toLowerCase().includes('mock') ? 'mock' : trimmedTag

  return `（${markerText}）`
})

type ChartResizeHandle = {
  readonly resize: () => void | Promise<void>
}

const tableGridStyle = computed(() => {
  const defaultColumnWidth = props.compact ? "minmax(92px, 1fr)" : "minmax(132px, 1fr)"
  const firstColumnTrack = props.compact ? "minmax(120px, 140px)" : "minmax(156px, 188px)"
  const columnTracks = props.tableColumns
    .map((column) => column.width ?? defaultColumnWidth)
    .join(" ")

  return {
    gridTemplateColumns: `${firstColumnTrack} ${columnTracks}`,
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

const handleRefresh = (): void => {
  emit("refresh")
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
