<template>
  <view :class="['table-chart-card__table', { 'table-chart-card__table--modal': isModal }]">
    <scroll-view
      v-if="hasTableData"
      :class="[
        'table-chart-card__table-scroll',
        { 'table-chart-card__table-scroll--modal': isModal },
      ]"
      scroll-x
      :scroll-y="isModal"
      :show-scrollbar="true"
    >
      <view :class="['data-table', { 'data-table--modal': isModal, 'data-table--compact': compact }]">
        <view class="data-table__row data-table__row--head" :style="tableGridStyle">
          <text class="data-table__cell data-table__cell--label"></text>
          <text
            v-for="column in tableColumns"
            :key="`${keyPrefix}-head-${column.key}`"
            :class="['data-table__cell', getCellAlignClass(column.align)]"
          >
            {{ column.label }}
          </text>
        </view>

        <view
          v-for="row in tableRows"
          :key="`${keyPrefix}-${row.key}`"
          :class="['data-table__row', getRowToneClass(row.tone)]"
          :style="tableGridStyle"
        >
          <text class="data-table__cell data-table__cell--label">
            {{ row.label }}<text v-if="row.unit" class="data-table__unit">{{ row.unit }}</text>
          </text>
          <text
            v-for="column in tableColumns"
            :key="`${keyPrefix}-${row.key}-${column.key}`"
            :class="['data-table__cell', getCellAlignClass(column.align)]"
          >
            {{ getCellText(row, column, tableData) }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view v-else class="table-chart-card__empty">
      <text>暂无表格配置</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue"
import {
  getCellAlignClass,
  getCellText,
  getRowToneClass,
} from "./TableChartCard.logic"
import type {
  TableColumnConfig,
  TableData,
  TableRowConfig,
} from "./TableChartCard.types"

const props = withDefaults(
  defineProps<{
    readonly tableRows: readonly TableRowConfig[]
    readonly tableColumns: readonly TableColumnConfig[]
    readonly tableData: TableData
    readonly tableGridStyle: Readonly<Record<"gridTemplateColumns", string>>
    readonly isModal?: boolean
    readonly compact?: boolean
  }>(),
  {
    isModal: false,
    compact: false,
  },
)

const hasTableData = computed(() => props.tableRows.length > 0 && props.tableColumns.length > 0)
const keyPrefix = computed(() => (props.isModal ? "modal" : "inline"))
</script>

<style scoped src="./TableChartCard.table.css"></style>
