import {
  getDeviceAvailabilityByDay,
  getDevicePauseRecords,
  type DeviceAvailabilityRecord,
  type DevicePauseRecord,
} from '../../../../api/deviceAvailability'
import { getDeviceRealtimeList, type DeviceRealtimeItem } from '../../../../api/deviceRealtime'
import { getScheduleDeviceLoadByMonth, type ScheduleDeviceLoadRecord } from '../../../../api/schedule'
import { mapRealtimeStatus } from '../../../../components/css-map/deviceRealtimeStatus'
import type { CssMapDevice, CssMapDeviceStatus } from '../../../../components/css-map/css3dMapTypes'
import { getEquipmentDetailData } from '../equipmentDetailMock'
import type { EquipmentDetailData, EquipmentDetailRow, EquipmentTimelineItem, FactoryKpiItem, KpiTone } from '../factoryDashboardTypes'
import { getCurrentDateParam, getCurrentMonthParam } from './dateTimeUtils'

const statusPresentation: Readonly<Record<CssMapDeviceStatus, { readonly label: string; readonly tone: KpiTone }>> = {
  production: { label: '生产中', tone: 'success' },
  abnormalStop: { label: '异常停止', tone: 'danger' },
  plannedStop: { label: '计划停止', tone: 'warning' },
  changeover: { label: '切替中', tone: 'warning' },
  cleaning: { label: '清扫中', tone: 'operation' },
  neutral: { label: '待机', tone: 'neutral' },
}

function getDeviceCode(device: CssMapDevice | null, fallbackDeviceId: string): string {
  return device?.deviceCode ?? device?.deviceCodes[0] ?? fallbackDeviceId
}

function asRecords<T>(response: { readonly data?: { readonly data?: T[] } }): readonly T[] {
  const data = response.data?.data
  return Array.isArray(data) ? data : []
}

function normalizeLoadRate(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value <= 2 ? value * 100 : value
}

function formatMinutes(hours: number | undefined): string | null {
  if (typeof hours !== 'number' || !Number.isFinite(hours)) return null
  return `${Math.round(hours * 60)} 分钟`
}

function formatTime(value: string | undefined): string {
  if (!value) return '--'
  const match = /(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/u.exec(value)
  return match?.[1] ?? value
}

function getPauseReason(record: DevicePauseRecord): string {
  return record.pauseReason?.trim() || record.reason?.trim() || '未分类暂停'
}

function getPauseStartTime(record: DevicePauseRecord): string | undefined {
  return record.startTime ?? record.pauseStartTime
}

function getPauseEndTime(record: DevicePauseRecord): string | undefined {
  return record.endTime ?? record.pauseEndTime
}

function getPauseMinutes(record: DevicePauseRecord): number | null {
  const minutes = record.durationMinutes ?? record.minutes
  return typeof minutes === 'number' && Number.isFinite(minutes) ? minutes : null
}

function createPauseTimeline(records: readonly DevicePauseRecord[]): readonly EquipmentTimelineItem[] {
  if (records.length === 0) {
    return [{ time: '--', title: '暂无暂停记录', detail: '接口已返回当日无暂停记录' }]
  }
  return [...records]
    .sort((left, right) => String(getPauseStartTime(left) ?? '').localeCompare(String(getPauseStartTime(right) ?? '')))
    .map((record) => ({
      time: formatTime(getPauseStartTime(record)),
      title: getPauseReason(record),
      detail: `${record.status?.trim() || '暂停'} · ${formatTime(getPauseStartTime(record))}–${formatTime(getPauseEndTime(record))} · ${getPauseMinutes(record) === null ? '时长未提供' : `${getPauseMinutes(record)} 分钟`}`,
    }))
}

function createPauseReasonRows(records: readonly DevicePauseRecord[]): readonly EquipmentDetailRow[] {
  if (records.length === 0) return [{ label: '暂停记录', value: '暂无记录', tone: 'neutral' }]
  const minutesByReason = new Map<string, number>()
  records.forEach((record) => {
    const minutes = getPauseMinutes(record) ?? 0
    const reason = getPauseReason(record)
    minutesByReason.set(reason, (minutesByReason.get(reason) ?? 0) + minutes)
  })
  return [...minutesByReason.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([reason, minutes]) => ({ label: reason, value: `${Math.round(minutes)} 分钟`, tone: 'warning' }))
}

function createRealKpis(
  fallback: readonly FactoryKpiItem[], realtime: DeviceRealtimeItem | null,
  load: ScheduleDeviceLoadRecord | null, availability: DeviceAvailabilityRecord | null,
  pauses: readonly DevicePauseRecord[] | null, realtimeLoaded: boolean,
  loadLoaded: boolean, availabilityLoaded: boolean,
): readonly FactoryKpiItem[] {
  const fallbackByLabel = new Map(fallback.map((item) => [item.label, item]))
  const item = (label: string) => fallbackByLabel.get(label)!
  const unavailable = (label: string): FactoryKpiItem => ({
    label,
    value: '—',
    note: '接口未返回该设备数据',
    tone: 'neutral',
  })
  const status = realtime === null ? null : mapRealtimeStatus(realtime)
  const loadRate = normalizeLoadRate(load?.fuhe)
  const latestPause = pauses === null || pauses.length === 0
    ? undefined
    : [...pauses].sort((left, right) => String(getPauseStartTime(right) ?? '').localeCompare(String(getPauseStartTime(left) ?? '')))[0]
  const task = realtime?.productionTaskList?.[0]
  const taskRate = typeof task?.actualCount === 'number' && typeof task?.targetCount === 'number' && task.targetCount > 0
    ? task.actualCount / task.targetCount * 100 : null
  const obstruction = formatMinutes(availability?.obstructionHours)

  return [
    status === null ? (realtimeLoaded ? unavailable('状态') : item('状态')) : { label: '状态', value: statusPresentation[status].label, note: '实时设备状态', tone: statusPresentation[status].tone },
    loadRate === null ? (loadLoaded ? unavailable('平均负荷率') : item('平均负荷率')) : { label: '平均负荷率', value: `${loadRate.toFixed(1)}%`, note: '当月负荷', tone: 'operation' },
    realtime === null ? (realtimeLoaded ? unavailable('在岗人员') : item('在岗人员')) : { label: '在岗人员', value: `${realtime.onlinePersonList.length} 人`, note: '实时在线人员', tone: 'neutral' },
    obstruction === null ? (availabilityLoaded ? unavailable('阻碍时间') : item('阻碍时间')) : { label: '阻碍时间', value: obstruction, note: '今日累计', tone: 'warning' },
    latestPause === undefined ? (pauses === null ? item('停止类型') : { label: '停止类型', value: '无暂停', note: '当日暂无记录', tone: 'neutral' }) : { label: '停止类型', value: getPauseReason(latestPause), note: latestPause.status?.trim() || '最近暂停', tone: 'danger' },
    taskRate === null ? (realtimeLoaded ? unavailable('计划达成') : item('计划达成')) : { label: '计划达成', value: `${taskRate.toFixed(1)}%`, note: task?.productionNumber || '当前生产任务', tone: 'success' },
  ]
}

/** 仅覆盖已具备稳定契约的实时运行信息；计划表、品质和周期仍保留 mock。 */
export async function loadEquipmentDetailData(device: CssMapDevice | null, fallbackDeviceId = ''): Promise<EquipmentDetailData> {
  const fallback = getEquipmentDetailData(device, fallbackDeviceId)
  const deviceCode = getDeviceCode(device, fallbackDeviceId)
  if (!deviceCode) return fallback
  const [realtimeResult, loadResult, availabilityResult, pausesResult] = await Promise.allSettled([
    getDeviceRealtimeList({ deviceCode }),
    getScheduleDeviceLoadByMonth(getCurrentMonthParam()),
    getDeviceAvailabilityByDay({ day: getCurrentDateParam(), deviceCode }),
    getDevicePauseRecords({ deviceCode, queryDate: getCurrentDateParam() }),
  ])
  const realtime = realtimeResult.status === 'fulfilled'
    ? asRecords<DeviceRealtimeItem>(realtimeResult.value).find((entry) => entry.deviceCode === deviceCode) ?? null : null
  const load = loadResult.status === 'fulfilled'
    ? asRecords<ScheduleDeviceLoadRecord>(loadResult.value).find((entry) => entry.devCode === deviceCode) ?? null : null
  const availability = availabilityResult.status === 'fulfilled'
    ? asRecords<DeviceAvailabilityRecord>(availabilityResult.value)[0] ?? null : null
  const pauses = pausesResult.status === 'fulfilled' ? asRecords<DevicePauseRecord>(pausesResult.value) : null
  return {
    ...fallback,
    kpis: createRealKpis(
      fallback.kpis,
      realtime,
      load,
      availability,
      pauses,
      realtimeResult.status === 'fulfilled',
      loadResult.status === 'fulfilled',
      availabilityResult.status === 'fulfilled',
    ),
    lossReasons: pauses === null ? fallback.lossReasons : createPauseReasonRows(pauses),
    timeline: pauses === null ? fallback.timeline : createPauseTimeline(pauses),
  }
}
