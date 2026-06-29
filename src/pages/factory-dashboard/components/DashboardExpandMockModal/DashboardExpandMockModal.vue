<script setup lang="ts">
import { computed } from 'vue'
import TableChartCardTable from '../../../../components/table-chart-card/TableChartCardTable.vue'
import type {
  TableCellValue,
  TableColumnConfig,
  TableData,
  TableRowConfig,
  TableRowTone,
} from '../../../../components/table-chart-card/TableChartCard.types'

const props = withDefaults(
  defineProps<{
    readonly title: string
    readonly subtitle?: string
    readonly rows?: readonly TableRowConfig[]
  }>(),
  {
    subtitle: '',
    rows: () => [
      { key: 'plan', label: '计划' },
      { key: 'actual', label: '实绩', tone: 'success' as TableRowTone },
    ],
  },
)

const emit = defineEmits<{
  close: []
}>()

// 列：1个月合计 + 4周 + 30天
const columns = computed<readonly TableColumnConfig[]>(() => {
  const cols: TableColumnConfig[] = [
    { key: 'month', label: '月合计', width: 'minmax(180px, 1.6fr)' },
    { key: 'week1', label: '1W', width: 'minmax(150px, 1fr)' },
    { key: 'week2', label: '2W', width: 'minmax(150px, 1fr)' },
    { key: 'week3', label: '3W', width: 'minmax(150px, 1fr)' },
    { key: 'week4', label: '4W', width: 'minmax(150px, 1fr)' },
  ]
  for (let day = 1; day <= 30; day++) {
    cols.push({
      key: `day${day}`,
      label: `${day}`,
      width: 'minmax(108px, 1fr)',
    })
  }
  return cols
})

const tableGridStyle = computed(() => {
  const firstColumnTrack = 'minmax(176px, 200px)'
  const columnTracks = columns.value
    .map((column) => column.width ?? 'minmax(120px, 1fr)')
    .join(' ')
  return { gridTemplateColumns: `${firstColumnTrack} ${columnTracks}` }
})

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 单元格基数：月合计 80000、周 20000、日 3000 */
function baseForColumn(colKey: string): number {
  if (colKey === 'month') return 80000
  if (colKey.startsWith('week')) return 20000
  return 3000
}

/** 不同行标签对应不同的相对系数，模拟实际数据形态 */
function coefficientForLabel(label: string): number {
  if (label === '直接出勤率') return 0
  if (label.startsWith('计划')) {
    if (label.includes('定时')) return 1
    if (label.includes('平日')) return 0.18
    if (label.includes('休日')) return 0.08
    if (label.includes('祝日')) return 0.04
    if (label.endsWith('合计')) return 1.3
  }
  if (label.startsWith('实绩')) {
    if (label.includes('定时')) return 0.97
    if (label.includes('平日')) return 0.15
    if (label.includes('休日')) return 0.07
    if (label.includes('祝日')) return 0.03
    if (label.endsWith('合计')) return 1.22
  }
  // 默认：计划/实绩 两行
  if (label === '计划') return 1
  if (label === '实绩') return 0.97
  return 0.9
}

function isRateRow(label: string): boolean {
  return label === '直接出勤率' || label.includes('率')
}

function generateCell(rowKey: string, rowLabel: string, colKey: string): TableCellValue {
  if (isRateRow(rowLabel)) {
    const base = 70
    const span = 30
    const h = hashString(`${rowKey}:${colKey}`)
    return base + (h % span)
  }
  const base = baseForColumn(colKey)
  const coef = coefficientForLabel(rowLabel)
  if (coef === 0) return 0
  const h = hashString(`${rowKey}:${colKey}`)
  const jitter = (h % Math.max(base, 1000)) / 1000 // 0..1
  const noise = (jitter - 0.5) * Math.max(base * 0.06, 50)
  return Math.max(0, Math.round(base * coef + noise))
}

const tableData = computed<TableData>(() => {
  const data: Record<string, Record<string, TableCellValue>> = {}
  for (const row of props.rows) {
    const rowCells: Record<string, TableCellValue> = {}
    for (const col of columns.value) {
      rowCells[col.key] = generateCell(row.key, row.label, col.key)
    }
    data[row.key] = rowCells
  }
  return data
})

function handleMaskClick(): void {
  emit('close')
}

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <view
    class="dashboard-expand-mock-modal__layer"
    role="dialog"
    aria-modal="true"
    @click="handleMaskClick"
  >
    <view class="dashboard-expand-mock-modal" @click.stop>
      <view class="dashboard-expand-mock-modal__head">
        <view class="dashboard-expand-mock-modal__title-group">
          <text class="dashboard-expand-mock-modal__title">{{ title }}<text class="dashboard-expand-mock-modal__title-marker">（mock）</text></text>
          <text v-if="subtitle" class="dashboard-expand-mock-modal__subtitle">{{ subtitle }}</text>
        </view>
        <button
          class="dashboard-expand-mock-modal__close"
          type="button"
          aria-label="关闭"
          @click="handleClose"
        >
          <svg
            class="dashboard-expand-mock-modal__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 16h3v3h2v-5H5v2Zm3-8H5v2h5V5H8v3Zm6 11h2v-3h3v-2h-5v5Zm2-11V5h-2v5h5V8h-3Z" />
          </svg>
        </button>
      </view>

      <view class="dashboard-expand-mock-modal__body">
        <TableChartCardTable
          :table-rows="rows"
          :table-columns="columns"
          :table-data="tableData"
          :table-grid-style="tableGridStyle"
          is-modal
        />
        <view class="dashboard-expand-mock-modal__note">
          <text>演示数据：列覆盖月合计、4 周以及每日 30 天；行展开为各分项计划/实绩可滚动浏览。数据为 mock。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped src="./DashboardExpandMockModal.css"></style>