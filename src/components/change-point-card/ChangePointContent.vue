<script setup lang="ts">
import { computed } from 'vue'
import { changePointCategories, filterChangePoints } from '../../pages/factory-dashboard/data/loaders/loadChangePointCard'
import type { ChangePointData, ChangePointFilters } from '../../pages/factory-dashboard/data/loaders/loadChangePointCard'
const props = defineProps<{ data: ChangePointData; filters: ChangePointFilters; expanded?: boolean }>()
const emit = defineEmits<{ 'update:filters': [value: ChangePointFilters] }>()
const rows = computed(() => filterChangePoints(props.data.records, props.filters))
const shifts = computed(() => [...new Set(['早', '中', '晚', ...props.data.records.map(row => row.shift).filter(Boolean)])])
const invalidDates = computed(() => props.filters.startDate && props.filters.endDate && props.filters.startDate > props.filters.endDate)
function update(field: keyof ChangePointFilters, event: Event) {
  emit('update:filters', { ...props.filters, [field]: (event.target as HTMLInputElement).value })
}
function updateDate(field: 'startDate' | 'endDate', event: { detail: { value: string } }) {
  emit('update:filters', { ...props.filters, [field]: event.detail.value })
}
function reset() { emit('update:filters', { startDate: '', endDate: '', shift: '', state: '' }) }
function color(type?: string) { return changePointCategories.find(category => category.type === type)?.color }
function dateLabel(date?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '')
  return match ? `${match[1].slice(2)}年${match[2]}月${match[3]}日` : date || '—'
}
</script>

<template>
  <view class="change-point-content">
    <view class="filters">
      <view class="date-field"><text>日期</text><picker mode="date" :value="filters.startDate" :end="filters.endDate || undefined" @change="updateDate('startDate', $event)"><view class="date-picker" role="button" aria-label="变化开始日期">{{ filters.startDate || '开始日期' }} ▾</view></picker></view>
      <view class="date-field"><text>至</text><picker mode="date" :value="filters.endDate" :start="filters.startDate || undefined" @change="updateDate('endDate', $event)"><view class="date-picker" role="button" aria-label="变化结束日期">{{ filters.endDate || '结束日期' }} ▾</view></picker></view>
      <label>班次 <select aria-label="变化班次" :value="filters.shift" @change="update('shift', $event)"><option value="">全部班次</option><option v-for="shift in shifts" :key="shift" :value="shift">{{ shift }}</option></select></label>
      <label>状态 <select aria-label="变化点状态" :value="filters.state" @change="update('state', $event)"><option value="">全部状态</option><option>进行中</option><option>已关闭</option><option>未知</option></select></label>
      <button class="reset" @click="reset">重置</button>
      <text class="count" role="status">共 {{ rows.length }} 条</text>
    </view>
    <view v-if="invalidDates" class="date-error" role="alert">开始日期不能晚于结束日期</view>
    <view class="table-scroll" :class="{ expanded }" tabindex="0" aria-label="变化点明细表，可横向和纵向滚动">
      <table>
        <colgroup><col style="width:210px" /><col style="width:145px" /><col style="width:100px" /><col style="width:145px" /><col style="width:90px" /><col style="width:180px" /><col style="width:240px" /><col style="width:270px" /><col style="width:210px" /><col style="width:145px" /><col style="width:145px" /><col style="width:105px" /><col style="width:145px" /><col style="width:160px" /></colgroup>
        <thead><tr><th v-for="heading in ['序号', '变化日期', '变化班次', '生产线', '5M分类', '变化点内容', '潜在风险', '管理方法', '实施结果', '责任者', '审核者', '状态', '解除日期', '备注']" :key="heading" scope="col">{{ heading }}</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row">{{ row.pid }}</th><td>{{ dateLabel(row.changeDate) }}</td><td>{{ row.shift || '—' }}</td><td>{{ row.device || '—' }}</td>
            <td class="category" :style="{ backgroundColor: color(row.type) }">{{ row.type || '—' }}</td>
            <td class="details">{{ row.changePointContent || '—' }}</td><td class="details">{{ row.potentialRisk || '—' }}</td><td class="details">{{ row.implMethod || '—' }}</td><td class="details">{{ row.implResult || '—' }}</td>
            <td>{{ row.respPerson || '—' }}</td><td>{{ row.reviewer || '—' }}</td><td>{{ row.state }}</td><td>{{ row.endDate?.trim() ? dateLabel(row.endDate.trim()) : '' }}</td><td class="details">{{ row.notes || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </view>
    <view v-if="!rows.length" class="empty" role="status">{{ data.status === 'error' ? '变化点数据暂不可用，请刷新重试' : data.records.length ? '暂无符合筛选条件的变化点' : '暂无变化点数据' }}</view>
  </view>
</template>

<style scoped>
.change-point-content { min-width: 0; }
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 15px; }
.filters label, .date-field { display: flex; align-items: center; gap: 8px; }
.date-picker, .filters select { box-sizing: border-box; height: 42px; min-width: 115px; padding: 0 10px; border: 1px solid var(--um-color-border); border-radius: 6px; color: var(--um-color-text-primary); background: var(--um-color-surface); font: inherit; }
.date-picker { min-width: 156px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.filters .reset { width: auto; height: 42px; padding: 0 16px; margin: 0; font-size: 15px; line-height: 40px; border: 1px solid var(--um-color-border); border-radius: 6px; background: var(--um-color-surface); color: var(--um-color-operation); }
.reset::after { border: 0; }
.count { margin-left: auto; color: var(--um-color-text-secondary); }
.date-error { color: var(--um-color-danger); margin-bottom: 12px; }
.table-scroll { overflow: auto; max-height: 420px; border: 1px solid var(--um-color-border); }
.table-scroll.expanded { max-height: 65vh; }
table { width: 100%; min-width: 2290px; table-layout: fixed; border-collapse: separate; border-spacing: 0; font-size: 17px; line-height: 1.5; text-align: center; font-variant-numeric: tabular-nums; }
th, td { padding: 6px 8px; border-right: 1px solid var(--um-color-border); border-bottom: 1px solid var(--um-color-border); vertical-align: top; overflow-wrap: anywhere; }
thead th { position: sticky; top: 0; z-index: 2; background: var(--um-color-operation-soft); font-weight: 600; white-space: nowrap; }
tr > :first-child { position: sticky; left: 0; z-index: 1; background: var(--um-color-surface); font-weight: 400; }
thead tr > :first-child { z-index: 3; background: var(--um-color-operation-soft); font-weight: 600; }
tr > :last-child { border-right: 0; }
tbody tr:last-child > * { border-bottom: 0; }
.details { text-align: left; white-space: pre-wrap; }
.category { color: #fff; font-weight: 700; }
.empty { padding: 40px 16px; text-align: center; color: var(--um-color-text-secondary); font-size: 16px; }
</style>
