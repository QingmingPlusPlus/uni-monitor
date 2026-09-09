<script setup lang="ts">
import './dailyReport.css'
import { onLoad } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { getDailyAttendance, getDailyProduction, getDailyLineLosses, getDailyQuality } from '../../api/dailyReport'
import type { AttendanceReport, ProductionReport, LineLossReport, QualityReport } from '../../api/dailyReport'
import type { CssMapSelectionConfig } from '../../components/css-map/css3dMapTypes'
import { defaultCssMapSelectionConfig } from '../../components/css-map/css3dMapSelection'
import { loadCssMapSelectionConfig } from '../../components/css-map/css3dMapSelectionLoader'
import { buildDepartmentUrl, buildProcessUrl, navigateToFactoryUrl, readCurrentFactoryRouteQuery, subscribeFactoryRouteQueryChange } from '../factory-dashboard/utils/factoryRoutes'
import { toApiDepartmentCode } from '../factory-dashboard/data/loaders/cssMapValueMapping'
import { isReportDate, offsetDate, processLabels, processOptions } from './reportModel'
import { buildDailyReportUrl, reportBackProcess, resolveReportSelection } from './reportRoutes'
import { createReportResource, initialSection } from './reportResource'
import { validAttendance, validProduction, validLines, validQuality } from './reportValidation'
import AttendanceSection from './components/AttendanceSection.vue'
import ProductionSection from './components/ProductionSection.vue'
import LineLossSection from './components/LineLossSection.vue'
import QualitySection from './components/QualitySection.vue'

const config = shallowRef<CssMapSelectionConfig>(defaultCssMapSelectionConfig)
const applied = ref(resolveReportSelection(undefined, config.value))
const draft = ref({ ...applied.value })
const ready = ref(false)
const configWarning = ref('')
const dateError = ref('')
let routeQuery: Record<string, string | undefined> | undefined
let from: 'department' | 'process' = 'department'
let sourceProcessId: string | undefined
let disposed = false
let stopRouteSync: (() => void) | undefined
const attendance = shallowRef(initialSection<AttendanceReport>())
const production = shallowRef(initialSection<ProductionReport>())
const lines = shallowRef(initialSection<LineLossReport>())
const quality = shallowRef(initialSection<QualityReport>())
const resources = {
  attendance: createReportResource(getDailyAttendance, state => { attendance.value = state }, validAttendance),
  production: createReportResource(getDailyProduction, state => { production.value = state }, validProduction),
  lines: createReportResource(getDailyLineLosses, state => { lines.value = state }, validLines),
  quality: createReportResource(getDailyQuality, state => { quality.value = state }, validQuality),
}
const options = computed(() => processOptions(draft.value.departmentId, config.value))
const reportDate = computed(() => offsetDate(applied.value.date, 1))
const departmentLabel = computed(() => config.value.departmentOptions.find(option => option.value === applied.value.departmentId)?.labelKey)
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const states = computed(() => [attendance.value, production.value, lines.value, quality.value])
const loadedCount = computed(() => states.value.filter(state => state.status === 'ready').length)
const loading = computed(() => states.value.some(state => state.status === 'loading'))

function apiQuery() {
  return { date: applied.value.date, department: toApiDepartmentCode(applied.value.departmentId), processType: applied.value.processType }
}
function loadAll() {
  const query = apiQuery()
  void Promise.allSettled(Object.values(resources).map(resource => resource.load(query)))
}
function retry(section: keyof typeof resources) { void resources[section].load(apiQuery()) }
function syncQuery(query: Record<string, string | undefined> | undefined, force = false) {
  routeQuery = query
  from = query?.from === 'process' ? 'process' : 'department'
  sourceProcessId = query?.sourceProcessId
  const next = resolveReportSelection(query, config.value)
  const changed = JSON.stringify(next) !== JSON.stringify(applied.value)
  applied.value = next
  draft.value = { ...next }
  dateError.value = query?.date && !isReportDate(query.date) ? '日期无效，已恢复为昨日。' : ''
  if (ready.value && (force || changed)) loadAll()
}
onLoad(query => { routeQuery = query })
onMounted(async () => {
  try { config.value = await loadCssMapSelectionConfig() }
  catch { configWarning.value = '部门工序配置加载失败，当前使用内置配置。' }
  if (disposed) return
  ready.value = true
  syncQuery(readCurrentFactoryRouteQuery() ?? routeQuery, true)
  stopRouteSync = subscribeFactoryRouteQueryChange(() => {
    if (window.location.hash.includes('/pages/daily-report/index')) syncQuery(readCurrentFactoryRouteQuery())
  })
})
onBeforeUnmount(() => {
  disposed = true
  stopRouteSync?.()
  Object.values(resources).forEach(resource => resource.dispose())
})
function changeDepartment() {
  if (!options.value.some(option => option.value === draft.value.processType) && options.value[0]) draft.value.processType = options.value[0].value
}
function changeDate(event: { detail: { value: string } }) { draft.value.date = event.detail.value; dateError.value = '' }
function queryReport() {
  if (!isReportDate(draft.value.date)) { dateError.value = '请选择有效的数据日期'; return }
  applied.value = { ...draft.value }
  const url = buildDailyReportUrl(applied.value, from, sourceProcessId)
  // H5 筛选替换当前历史项；浏览器刷新可恢复，返回不会逐个穿过筛选记录。
  if (typeof window !== 'undefined') window.history.replaceState(window.history.state, '', `#${url}`)
  else uni.redirectTo({ url })
  loadAll()
}
function backToDashboard() {
  const process = reportBackProcess(applied.value, config.value, sourceProcessId)
  navigateToFactoryUrl(from === 'process' && process ? buildProcessUrl(process) : buildDepartmentUrl(applied.value.departmentId))
}
</script>

<template>
  <main class="daily-report">
    <header class="report-header"><div><p class="report-eyebrow">减震制造部 · 现场管理</p><h1>制造日报</h1></div><button role="button" class="report-button" @click="backToDashboard">返回看板</button></header>
    <section class="report-filter" aria-label="日报查询条件">
      <label>部门<select v-model="draft.departmentId" :disabled="!ready" @change="changeDepartment"><option v-for="option in config.departmentOptions" :key="option.value" :value="option.value">{{ option.labelKey }}</option></select></label>
      <label>工序<select v-model="draft.processType" :disabled="!ready || !options.length"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      <div class="report-date-control"><span>数据日期</span><picker mode="date" :value="draft.date" :disabled="!ready" @change="changeDate"><div class="report-date-picker" role="button" aria-label="选择数据日期">{{ draft.date }} <span aria-hidden="true">▾</span></div></picker></div>
      <button role="button" class="report-button report-button--primary" :disabled="!ready || !options.length" @click="queryReport">查询</button>
      <button role="button" class="report-button" :disabled="!ready || dirty || loading" @click="loadAll">{{ loading ? '刷新中' : '刷新' }}</button>
      <span v-if="dirty" class="report-muted">条件已更改，点击查询后生效</span>
    </section>
    <p v-if="dateError || configWarning" class="report-warning" role="status">{{ dateError || configWarning }}</p>
    <div class="report-overview" aria-live="polite"><div><strong>{{ departmentLabel }} · {{ processLabels[applied.processType] }}</strong><span>数据日期 {{ applied.date }}</span><span>报告日期 {{ reportDate }}</span></div><span>{{ loading ? '正在更新' : `已加载 ${loadedCount}/4 个分区` }} · 各区统计范围与更新时间见下方</span></div>
    <AttendanceSection :state="attendance" :date="applied.date" @retry="retry('attendance')" />
    <ProductionSection :state="production" @retry="retry('production')" />
    <LineLossSection :state="lines" @retry="retry('lines')" />
    <QualitySection :state="quality" :process="applied.processType" @retry="retry('quality')" />
    <footer class="report-footer">历史日报展示当前查询结果。未完成或缺失的输入不参与比率计算；“—”表示暂无有效数值。</footer>
  </main>
</template>
