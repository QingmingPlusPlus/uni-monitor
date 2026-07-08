import type {
  DeviceRealtimeItem,
  DeviceRealtimeOnlinePerson,
  DeviceRealtimeProductionTask,
} from '../../api/deviceRealtime'
import type {
  ScheduleChangePointRecord,
  ScheduleDeviceLoadRecord,
} from '../../api/schedule'

export const CSS_MAP_MOCK_CHANGE_EVENT = 'uni-monitor:css-map-mock-change'

const CSS_MAP_MOCK_STORAGE_KEY = 'uni-monitor:css-map:mock-runtime'

declare global {
  interface Window {
    mapMock?: (enabled: boolean) => boolean
    __UNI_MONITOR_MAP_MOCK__?: boolean
  }
}

interface MockStatusSample {
  readonly actualStatus: string
  readonly actualStatusName: string
  readonly deviceParseType: string | null
  readonly deviceParseTypeName: string | null
}

const mockStatusSamples: readonly MockStatusSample[] = [
  {
    actualStatus: 'running',
    actualStatusName: '运行中',
    deviceParseType: null,
    deviceParseTypeName: null,
  },
  {
    actualStatus: 'normal',
    actualStatusName: '正常',
    deviceParseType: null,
    deviceParseTypeName: null,
  },
  {
    actualStatus: 'pause_running',
    actualStatusName: '运行暂停',
    deviceParseType: 'CUT',
    deviceParseTypeName: '切替',
  },
  {
    actualStatus: 'pause_not_running',
    actualStatusName: '未运行暂停',
    deviceParseType: 'CLEAN',
    deviceParseTypeName: '清扫',
  },
  {
    actualStatus: 'pause_running',
    actualStatusName: '运行暂停',
    deviceParseType: 'DEVICE_CHANGE',
    deviceParseTypeName: '设备故障',
  },
  {
    actualStatus: 'pause_not_running',
    actualStatusName: '未运行暂停',
    deviceParseType: 'REST',
    deviceParseTypeName: '休息',
  },
]

const mockProcessTypes = [
  'preprocessing',
  'sulfur_addition',
  'post_processing',
] as const

const mockFiveMTypes = ['人', '机', '料', '法', '环'] as const

function getBrowserWindow(): Window | null {
  return typeof window === 'undefined' ? null : window
}

function readStoredMockEnabled(win: Window): boolean {
  try {
    return win.sessionStorage.getItem(CSS_MAP_MOCK_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeStoredMockEnabled(win: Window, enabled: boolean): void {
  try {
    win.sessionStorage.setItem(CSS_MAP_MOCK_STORAGE_KEY, String(enabled))
  } catch {
    // sessionStorage may be unavailable in private or embedded browser contexts.
  }
}

function dispatchCssMapMockChange(win: Window, enabled: boolean): void {
  if (typeof win.dispatchEvent !== 'function') return
  if (typeof CustomEvent === 'function') {
    win.dispatchEvent(new CustomEvent(CSS_MAP_MOCK_CHANGE_EVENT, { detail: { enabled } }))
    return
  }
  if (typeof Event === 'function') {
    win.dispatchEvent(new Event(CSS_MAP_MOCK_CHANGE_EVENT))
  }
}

function normalizeDeviceCode(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function getUniqueDeviceCodes(deviceCodes: readonly string[]): string[] {
  const result: string[] = []
  for (const deviceCode of deviceCodes) {
    const normalizedCode = normalizeDeviceCode(deviceCode)
    if (!normalizedCode || result.includes(normalizedCode)) continue
    result.push(normalizedCode)
  }
  return result
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function createMockOnlinePerson(
  deviceCode: string,
  seed: number,
  index: number,
): DeviceRealtimeOnlinePerson {
  const employeeNumber = `MOCK-${String(seed % 1000).padStart(3, '0')}-${index + 1}`

  return {
    recordId: `${deviceCode}-mock-person-${index + 1}`,
    employeeId: employeeNumber,
    employeeName: `Mock人员${index + 1}`,
    employeeNumber,
    onlineTime: '',
    onlineStatus: 1,
    onlineStatusName: '在线',
    operationDeviceLevel: null,
    operationDeviceLevelName: null,
    employeePauseStatus: (seed + index) % 5 === 0 ? 1 : 0,
    employeePauseStatusName: (seed + index) % 5 === 0 ? '短时离岗' : '在线',
    employeePauseTypeName: null,
    employeePauseStartTime: null,
  }
}

function createMockProductionTask(
  deviceCode: string,
  seed: number,
): DeviceRealtimeProductionTask {
  const targetCount = 1000 + seed % 700
  const actualCount = Math.round(targetCount * (0.35 + (seed % 55) / 100))

  return {
    id: `${deviceCode}-mock-task`,
    planId: `${deviceCode}-mock-plan`,
    productionNumber: `PLAN-${deviceCode}`,
    planStatus: 1,
    planStatusDesc: '生产中',
    actualStartTime: '',
    targetCount,
    actualCount,
    completionRate: `${Math.round((actualCount / targetCount) * 100)}%`,
  }
}

export function isCssMapMockEnabled(): boolean {
  const win = getBrowserWindow()
  if (!win) return false

  if (typeof win.__UNI_MONITOR_MAP_MOCK__ !== 'boolean') {
    win.__UNI_MONITOR_MAP_MOCK__ = readStoredMockEnabled(win)
  }

  return win.__UNI_MONITOR_MAP_MOCK__
}

export function setCssMapMockEnabled(enabled: boolean): boolean {
  const win = getBrowserWindow()
  if (!win) return false

  const nextEnabled = Boolean(enabled)
  win.__UNI_MONITOR_MAP_MOCK__ = nextEnabled
  writeStoredMockEnabled(win, nextEnabled)
  dispatchCssMapMockChange(win, nextEnabled)

  return nextEnabled
}

export function installCssMapMockSwitch(): void {
  const win = getBrowserWindow()
  if (!win) return

  if (typeof win.__UNI_MONITOR_MAP_MOCK__ !== 'boolean') {
    win.__UNI_MONITOR_MAP_MOCK__ = readStoredMockEnabled(win)
  }

  win.mapMock = (enabled: boolean) => setCssMapMockEnabled(enabled)
}

export function subscribeCssMapMockChange(callback: (enabled: boolean) => void): () => void {
  const win = getBrowserWindow()
  if (!win || typeof win.addEventListener !== 'function') return () => undefined

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ readonly enabled?: boolean }>).detail
    callback(typeof detail?.enabled === 'boolean' ? detail.enabled : isCssMapMockEnabled())
  }

  win.addEventListener(CSS_MAP_MOCK_CHANGE_EVENT, listener)

  return () => {
    win.removeEventListener(CSS_MAP_MOCK_CHANGE_EVENT, listener)
  }
}

export function createCssMapMockRealtimeItems(
  deviceCodes: readonly string[],
): readonly DeviceRealtimeItem[] {
  return getUniqueDeviceCodes(deviceCodes).map((deviceCode, index) => {
    const seed = hashString(deviceCode)
    const status = mockStatusSamples[seed % mockStatusSamples.length]
    const staffCount = status.actualStatus === 'normal' ? 0 : 1 + seed % 3
    const processType = mockProcessTypes[index % mockProcessTypes.length]
    const departmentId = String(index % 4 + 1)

    return {
      deviceId: `mock-${deviceCode}`,
      deviceCode,
      deviceName: `Mock设备${index + 1}`,
      deviceType: null,
      deviceTypeName: null,
      factoryId: 'mock-factory',
      departmentId,
      departmentName: `制造${departmentId}课`,
      processType,
      processTypeName: processType,
      procedureName: '',
      scheduleMode: 'mock',
      deviceStatus: status.actualStatus,
      deviceStatusName: status.actualStatusName,
      actualStatus: status.actualStatus,
      actualStatusName: status.actualStatusName,
      deviceParseType: status.deviceParseType,
      deviceParseTypeName: status.deviceParseTypeName,
      onlinePersonList: Array.from({ length: staffCount }, (_, staffIndex) => (
        createMockOnlinePerson(deviceCode, seed, staffIndex)
      )),
      productionTaskList: status.actualStatus === 'running'
        ? [createMockProductionTask(deviceCode, seed)]
        : [],
    }
  })
}

export function createCssMapMockDeviceLoadRecords(
  deviceCodes: readonly string[],
): readonly ScheduleDeviceLoadRecord[] {
  return getUniqueDeviceCodes(deviceCodes).map((deviceCode, index) => {
    const seed = hashString(deviceCode)
    const fuhe = Number((28 + (seed % 7000) / 100).toFixed(1))

    return {
      devCode: deviceCode,
      devName: `Mock设备${index + 1}`,
      fuhe,
    }
  })
}

export function createCssMapMockChangePointRecords(
  deviceCodes: readonly string[],
): readonly ScheduleChangePointRecord[] {
  const today = new Date().toISOString().slice(0, 10)

  return getUniqueDeviceCodes(deviceCodes).flatMap((deviceCode) => {
    const seed = hashString(deviceCode)
    if (seed % 4 !== 0) return []

    const type = mockFiveMTypes[seed % mockFiveMTypes.length]
    const records: ScheduleChangePointRecord[] = [{
      date: today,
      device: deviceCode,
      type,
      change: `${type}变化`,
      varify: '待确认',
      notes: '地图mock数据',
    }]

    if (seed % 11 === 0) {
      const secondType = mockFiveMTypes[(seed + 2) % mockFiveMTypes.length]
      records.push({
        date: today,
        device: deviceCode,
        type: secondType,
        change: `${secondType}变化`,
        varify: '已确认',
        notes: '地图mock数据',
      })
    }

    return records
  })
}

installCssMapMockSwitch()
