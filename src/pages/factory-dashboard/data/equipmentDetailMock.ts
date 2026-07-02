import type { CssMapDevice } from '../../../components/css-map/css3dMapTypes'
import type { EquipmentDetailData, KpiTone } from './factoryDashboardTypes'

const mockStatuses = {
  production: { label: '生产中', tone: 'success' },
  abnormalStop: { label: '异常停止', tone: 'danger' },
  plannedStop: { label: '计划停止', tone: 'warning' },
  changeover: { label: '切替中', tone: 'warning' },
  cleaning: { label: '清扫中', tone: 'operation' },
  neutral: { label: '待机', tone: 'neutral' },
} as const satisfies Readonly<Record<NonNullable<CssMapDevice['runtime']['status']>, {
  readonly label: string
  readonly tone: KpiTone
}>>

const mockStatusKeys = [
  'production',
  'abnormalStop',
  'plannedStop',
  'changeover',
  'cleaning',
  'neutral',
] as const satisfies readonly (keyof typeof mockStatuses)[]

const shiftNames = ['早班', '中班', '夜班'] as const
const planNames = ['EPDM 成型', '硫化保持', '外观复检', '配方切替', '设备点检'] as const
const ownerNames = ['白班 A 组', '白班 B 组', '保全联络组', '品质确认组'] as const
const stopTypes = ['用餐', '材料等待', '换模', '品质确认', '设备点检'] as const
const defectNames = ['气泡', '毛边', '尺寸偏差', '外观划伤', '压痕'] as const

function getMockSeed(value: string): number {
  let seed = 0

  for (const character of value) {
    seed = (seed * 31 + character.charCodeAt(0)) % 9973
  }

  return seed
}

function pickMockValue<T>(values: readonly [T, ...T[]], seed: number): T {
  return values[seed % values.length] ?? values[0]
}

function getMockStatus(device: CssMapDevice | null, seed: number): keyof typeof mockStatuses {
  const runtimeStatus = device?.runtime.status

  if (runtimeStatus) return runtimeStatus

  return pickMockValue(mockStatusKeys, seed)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getEquipmentDetailData(
  device: CssMapDevice | null,
  fallbackDeviceId = '',
): EquipmentDetailData {
  const fallbackId = fallbackDeviceId.trim()
  const deviceId = device?.id ?? (fallbackId.length > 0 ? fallbackId : 'device-01')
  const deviceName = device?.name ?? `设备 ${deviceId}`
  const deviceCode = device?.deviceCode ?? device?.deviceCodes[0] ?? deviceId
  const seed = getMockSeed(deviceId)
  const statusKey = getMockStatus(device, seed)
  const status = mockStatuses[statusKey]
  const loadRate = device?.runtime.loadRate ?? (58 + seed % 34)
  const staffCount = device?.runtime.staff.length ?? (2 + seed % 4)
  const stopMinutes = 12 + seed % 36
  const waitMinutes = 8 + seed % 18
  const defectCount = 6 + seed % 24
  const shiftName = pickMockValue(shiftNames, seed)
  const planName = pickMockValue(planNames, seed + 1)
  const ownerName = pickMockValue(ownerNames, seed + 2)
  const stopType = pickMockValue(stopTypes, seed + 3)
  const mainDefect = pickMockValue(defectNames, seed + 4)

  return {
    eyebrow: `${deviceId} · 设备维度`,
    title: `${deviceName} 停止与计划分析`,
    subtitle: `设备编码 ${deviceCode}，当前展示计划、停线、损耗和周期信息。`,
    kpis: [
      { label: '状态', value: status.label, note: '当前设备状态', tone: status.tone },
      { label: '平均负荷率', value: formatPercent(loadRate), note: '当月负荷', tone: 'operation' },
      { label: '在岗人员', value: `${staffCount} 人`, note: shiftName, tone: 'neutral' },
      { label: '阻碍时间', value: `${stopMinutes} 分钟`, note: '今日累计', tone: 'warning' },
      { label: '停止类型', value: stopType, note: '当前主因', tone: 'danger' },
      { label: '计划达成', value: formatPercent(88 + seed % 10), note: planName, tone: 'success' },
    ],
    currentPlan: [
      { label: '日期', value: '2026-06-30' },
      { label: '班次', value: shiftName },
      { label: '时间', value: '08:00-17:00' },
      { label: '设备', value: deviceName },
      { label: '计划', value: planName, tone: 'operation' },
      { label: '负责人', value: ownerName },
    ],
    downtimePlan: [
      { label: '已完成计划', value: `${2 + seed % 3} 项`, tone: 'success' },
      { label: '进行中计划', value: '1 项', tone: 'operation' },
      { label: '未开始计划', value: `${seed % 2} 项`, tone: 'warning' },
    ],
    lossReasons: [
      { label: '不良明细', value: `${defectCount} 件`, tone: 'danger' },
      { label: '设备等待', value: `${waitMinutes} 分钟`, tone: 'warning' },
      { label: '材料等待', value: `${Math.max(4, waitMinutes - 5)} 分钟`, tone: 'warning' },
      { label: '其他', value: `${3 + seed % 6} 分钟` },
    ],
    defectReasons: [
      { label: '主缺陷', value: mainDefect, tone: 'danger' },
      { label: '原材料', value: `${3 + seed % 7} 件` },
      { label: '调试', value: `${2 + seed % 5} 件` },
      { label: '其他', value: `${1 + seed % 4} 件` },
    ],
    timeline: [
      { time: '08:20', title: '计划开始', detail: `${planName} 进入生产准备状态` },
      { time: '10:15', title: '短暂停止', detail: `${stopType} 导致设备暂停 ${stopMinutes} 分钟` },
      { time: '13:40', title: '恢复生产', detail: `${ownerName} 完成确认，设备恢复执行计划` },
    ],
    cycleRows: [
      { label: '班次', value: shiftName },
      { label: '工序', value: device?.section ?? '--' },
      { label: '标准周期', value: '45/60min' },
      { label: '当前周期', value: `${44 + seed % 6}/60min`, tone: 'operation' },
      { label: '下次点检', value: '16:30', tone: 'neutral' },
    ],
  }
}
