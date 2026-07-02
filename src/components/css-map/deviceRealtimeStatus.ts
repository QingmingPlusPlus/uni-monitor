import type { DeviceRealtimeItem } from '../../api/deviceRealtime'
import type { CssMapDeviceStatus } from './css3dMapTypes'

type DeviceActualStatus = 'normal' | 'running' | 'pause_running' | 'pause_not_running'

const deviceActualStatusNames: Readonly<Record<string, DeviceActualStatus>> = {
  正常: 'normal',
  运行中: 'running',
  运行暂停: 'pause_running',
  未运行暂停: 'pause_not_running',
}

const deviceParseTypeNames: Readonly<Record<string, string>> = {
  切替: 'CUT',
  设备故障: 'DEVICE_CHANGE',
  品质异常: 'QUALITY_CHECK',
  待材料: 'MATERIAL_WAIT',
  用餐: 'TOOL_CHANGE',
  休息: 'REST',
  新开机: 'STARTUP',
  计划停止: 'SHUTDOWN',
  清扫: 'CLEAN',
  首摸不良: 'POOR_INITIAL_TOUCH',
  清枪头: 'CLEAR_GUN_HEAD',
}

const plannedStopDeviceParseTypes = new Set([
  'TOOL_CHANGE',
  'DEVICE_TOOL_CHANGE',
  'REST',
  'DEVICE_REST',
])

function normalizeActualStatus(value: string | null | undefined): DeviceActualStatus | null {
  const status = String(value ?? '').trim().toLowerCase()
  if (
    status === 'normal' ||
    status === 'running' ||
    status === 'pause_running' ||
    status === 'pause_not_running'
  ) {
    return status
  }

  return null
}

function resolveActualStatus(item: DeviceRealtimeItem): DeviceActualStatus | null {
  return (
    normalizeActualStatus(item.actualStatus) ??
    normalizeActualStatus(item.actualStatusName) ??
    deviceActualStatusNames[String(item.actualStatusName ?? '').trim()] ??
    null
  )
}

function normalizeDeviceParseType(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function resolveDeviceParseType(item: DeviceRealtimeItem): string {
  const parseType = normalizeDeviceParseType(item.deviceParseType)
  if (parseType) return parseType

  return deviceParseTypeNames[String(item.deviceParseTypeName ?? '').trim()] ?? ''
}

function mapPausedRealtimeStatus(item: DeviceRealtimeItem): CssMapDeviceStatus {
  const parseType = resolveDeviceParseType(item)

  if (parseType === 'CUT') return 'changeover'
  if (parseType === 'CLEAN') return 'cleaning'
  if (plannedStopDeviceParseTypes.has(parseType)) return 'plannedStop'

  return 'abnormalStop'
}

export function mapRealtimeStatus(item: DeviceRealtimeItem | undefined): CssMapDeviceStatus | null {
  if (item === undefined) return null

  const actualStatus = resolveActualStatus(item)

  if (actualStatus === 'normal') return 'plannedStop'
  if (actualStatus === 'running') return 'production'
  if (actualStatus === 'pause_running' || actualStatus === 'pause_not_running') {
    return mapPausedRealtimeStatus(item)
  }

  return 'neutral'
}
