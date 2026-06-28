<template>
  <div
    ref="chartRoot"
    :class="chartClass"
  />
</template>

<script setup lang="ts">
import * as echarts from "echarts"
import type { EChartsInitOpts, EChartsType, SetOptionOpts } from "echarts"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import type { ChartOptionConfig } from "./TableChartCard.types"

const props = withDefaults(
  defineProps<{
    readonly option: ChartOptionConfig
    readonly initOptions?: EChartsInitOpts
    readonly updateOptions?: SetOptionOpts
    readonly class?: string
  }>(),
  {
    initOptions: undefined,
    updateOptions: undefined,
    class: "",
  },
)

const emit = defineEmits<{
  inited: []
}>()

const chartRoot = ref<HTMLElement | null>(null)
const chartClass = computed(() => props.class)
let chart: EChartsType | null = null
let resizeObserver: ResizeObserver | null = null

function resize(): void {
  chart?.resize()
}

function setOption(): void {
  chart?.setOption(props.option, props.updateOptions)
}

async function initializeChart(): Promise<void> {
  await nextTick()

  if (!chartRoot.value || chart !== null) return

  chart = echarts.init(chartRoot.value, undefined, props.initOptions)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(chartRoot.value)
  setOption()
  emit("inited")
}

onMounted(() => {
  initializeChart().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[TableChartEchart] init failed: ${message}`)
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})

watch(
  () => [props.option, props.updateOptions],
  () => {
    setOption()
    resize()
  },
  { deep: true, flush: "post" },
)

defineExpose({
  resize,
})
</script>
