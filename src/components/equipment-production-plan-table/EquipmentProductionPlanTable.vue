<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  EquipmentProductionPlanData,
  EquipmentProductionPlanRow,
  EquipmentProductionPlanStatus,
} from '../../pages/factory-dashboard/data/factoryDashboardTypes'

const props = defineProps<{
  readonly data: EquipmentProductionPlanData
}>()

const expandedStatuses = ref<readonly EquipmentProductionPlanStatus[]>([])

const statusOptions = [
  { status: 'active', label: '进行中' },
  { status: 'completed', label: '已完成' },
  { status: 'upcoming', label: '未开始' },
] as const satisfies readonly {
  readonly status: EquipmentProductionPlanStatus
  readonly label: string
}[]

const statusCounts = computed(() => Object.fromEntries(
  statusOptions.map(({ status }) => [
    status,
    props.data.rows.filter((row) => row.status === status).length,
  ]),
) as Record<EquipmentProductionPlanStatus, number>)

const visibleRows = computed(() => statusOptions.flatMap(({ status }) => {
  if (status !== 'active' && !expandedStatuses.value.includes(status)) return []

  return props.data.rows.filter((row) => row.status === status)
}))

function isExpanded(status: EquipmentProductionPlanStatus): boolean {
  return status === 'active' || expandedStatuses.value.includes(status)
}

function toggleStatus(status: EquipmentProductionPlanStatus): void {
  if (status === 'active') return

  expandedStatuses.value = expandedStatuses.value.includes(status)
    ? expandedStatuses.value.filter((item) => item !== status)
    : [...expandedStatuses.value, status]
}

function formatNumber(value: number | null): string {
  return value === null ? '-' : value.toLocaleString('zh-CN')
}

function formatRate(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)}%`
}

function getRateClass(value: number | null): string {
  return value !== null && value < 100 ? 'equipment-plan-table__rate--danger' : ''
}

function getRowStatusLabel(status: EquipmentProductionPlanStatus): string {
  return statusOptions.find((item) => item.status === status)?.label ?? status
}

function getResultLabel(result: EquipmentProductionPlanRow['result']): string {
  if (result === 'win') return '胜'
  if (result === 'loss') return '负'

  return '-'
}
</script>

<template>
  <section class="equipment-plan-table">
    <view class="equipment-plan-table__head">
      <view class="equipment-plan-table__title-group">
        <text class="equipment-plan-table__title">{{ data.title }}</text>
        <text class="equipment-plan-table__subtitle">{{ data.subtitle }}</text>
      </view>

      <view class="equipment-plan-table__filters" aria-label="生产计划状态">
        <template v-for="option in statusOptions" :key="option.status">
          <view
            v-if="option.status === 'active'"
            class="equipment-plan-table__status equipment-plan-table__status--active"
          >
            <text>{{ option.label }}</text>
            <text>{{ statusCounts[option.status] }}</text>
          </view>
          <button
            v-else
            class="equipment-plan-table__status equipment-plan-table__status--toggle"
            :class="{ 'equipment-plan-table__status--expanded': isExpanded(option.status) }"
            type="button"
            :aria-expanded="isExpanded(option.status)"
            @click="toggleStatus(option.status)"
          >
            <text>{{ option.label }}</text>
            <text>{{ statusCounts[option.status] }}</text>
            <text class="equipment-plan-table__chevron">⌄</text>
          </button>
        </template>
      </view>
    </view>

    <scroll-view class="equipment-plan-table__scroll" scroll-x>
      <table class="equipment-plan-table__table">
        <thead>
          <tr>
            <th rowspan="2">状态</th>
            <th rowspan="2">日期1</th>
            <th rowspan="2">日期2</th>
            <th rowspan="2">班次</th>
            <th rowspan="2">时间</th>
            <th rowspan="2">制番</th>
            <th rowspan="2">能力</th>
            <th rowspan="2" class="equipment-plan-table__head--planned">计划</th>
            <th rowspan="2" class="equipment-plan-table__head--actual">实绩</th>
            <th rowspan="2" class="equipment-plan-table__head--accepted">合格</th>
            <th rowspan="2" class="equipment-plan-table__head--flow">流动</th>
            <th rowspan="2" class="equipment-plan-table__head--defect">不良<br>合计</th>
            <th rowspan="2" class="equipment-plan-table__head--scrap">废弃<br>合计</th>
            <th rowspan="2">可动率<small>实绩/能力</small></th>
            <th rowspan="2">达成率<small>实绩/计划</small></th>
            <th rowspan="2">合格率<small>合格/实绩</small></th>
            <th rowspan="2">实力<small>计划/能力</small></th>
            <th rowspan="2">胜负</th>
            <th rowspan="2">停止内容</th>
            <th colspan="3">停止时间</th>
          </tr>
          <tr>
            <th>起</th>
            <th>止</th>
            <th>耗时(分)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleRows"
            :key="row.id"
            :class="`equipment-plan-table__row--${row.status}`"
          >
            <td>
              <text :class="`equipment-plan-table__badge equipment-plan-table__badge--${row.status}`">
                {{ getRowStatusLabel(row.status) }}
              </text>
            </td>
            <td>{{ row.productionDate }}</td>
            <td>{{ row.calendarDate }}</td>
            <td>{{ row.shift }}</td>
            <td>{{ row.time }}</td>
            <td class="equipment-plan-table__product">{{ row.productNumber }}</td>
            <td>{{ formatNumber(row.capacity) }}</td>
            <td class="equipment-plan-table__cell--planned">{{ formatNumber(row.planned) }}</td>
            <td class="equipment-plan-table__cell--actual">{{ formatNumber(row.actual) }}</td>
            <td class="equipment-plan-table__cell--accepted">{{ formatNumber(row.accepted) }}</td>
            <td class="equipment-plan-table__cell--flow">{{ formatNumber(row.flow) }}</td>
            <td class="equipment-plan-table__cell--defect">{{ formatNumber(row.defects) }}</td>
            <td class="equipment-plan-table__cell--scrap">{{ formatNumber(row.scrapped) }}</td>
            <td :class="getRateClass(row.availabilityRate)">{{ formatRate(row.availabilityRate) }}</td>
            <td :class="getRateClass(row.achievementRate)">{{ formatRate(row.achievementRate) }}</td>
            <td :class="getRateClass(row.acceptanceRate)">{{ formatRate(row.acceptanceRate) }}</td>
            <td :class="getRateClass(row.performanceRate)">{{ formatRate(row.performanceRate) }}</td>
            <td>
              <text
                v-if="row.result"
                :class="`equipment-plan-table__result equipment-plan-table__result--${row.result}`"
              >
                {{ getResultLabel(row.result) }}
              </text>
              <text v-else>-</text>
            </td>
            <td class="equipment-plan-table__stop-reason">{{ row.stopReason || '-' }}</td>
            <td>{{ row.stopStartedAt || '-' }}</td>
            <td>{{ row.stopEndedAt || '-' }}</td>
            <td>{{ row.stopDuration || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </scroll-view>
  </section>
</template>

<style scoped src="./EquipmentProductionPlanTable.css"></style>
