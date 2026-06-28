import type {
  CssMapDevice,
  CssMapDeviceRuntime,
  CssMapDeviceStatus,
  CssMapJsonDevice,
  CssMapJsonConfig,
  CssMapProcessBoundary,
  CssMapSize,
} from './css3dMapTypes'
import { getDeviceRealtimeList } from '../../api/deviceRealtime'
import { getScheduleDeviceLoadByMonth } from '../../api/schedule'
import type { DeviceRealtimeItem } from '../../api/deviceRealtime'
import type { ScheduleDeviceLoadRecord } from '../../api/schedule'

const FACTORY_MAP_CONFIG_URL = '/factory-map/devices.json'

export interface CssMapData {
  size: CssMapSize
  sections: CssMapProcessBoundary[]
  devices: CssMapDevice[]
}

function normalizeDeviceCode(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function appendUniqueDeviceCode(codes: string[], code: string | null | undefined) {
  const normalizedCode = normalizeDeviceCode(code)
  if (!normalizedCode || codes.includes(normalizedCode)) return
  codes.push(normalizedCode)
}

function collectDeviceRuntimeCodes(device: CssMapJsonDevice) {
  const codes: string[] = []
  appendUniqueDeviceCode(codes, device.deviceCode)
  device.deviceCodes?.forEach((code) => appendUniqueDeviceCode(codes, code))
  device.children?.forEach((child) => appendUniqueDeviceCode(codes, child.deviceCode))
  return codes
}

function createDeviceCodeLookup<T>(
  records: T[],
  getRecordCode: (record: T) => string | null | undefined,
) {
  const lookup = new Map<string, T[]>()

  records.forEach((record) => {
    const code = normalizeDeviceCode(getRecordCode(record))
    if (!code) return

    const bucket = lookup.get(code)
    if (bucket) {
      bucket.push(record)
      return
    }

    lookup.set(code, [record])
  })

  return lookup
}

function getRecordsByDeviceCodes<T>(lookup: Map<string, T[]>, codes: string[]) {
  const result: T[] = []
  const seenRecords = new Set<T>()

  codes.forEach((code) => {
    lookup.get(normalizeDeviceCode(code))?.forEach((record) => {
      if (seenRecords.has(record)) return
      seenRecords.add(record)
      result.push(record)
    })
  })

  return result
}

function mapDeviceStatus(device: DeviceRealtimeItem): CssMapDeviceStatus | null {
  const statusText = [
    device.actualStatus,
    device.actualStatusName,
    device.deviceStatus,
    device.deviceStatusName,
    device.deviceParseTypeName,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  if (/异常|故障|error|fault|alarm/.test(statusText)) return 'abnormalStop'
  if (/换型|切替|change/.test(statusText)) return 'changeover'
  if (/清扫|clean/.test(statusText)) return 'cleaning'
  if (/停|pause|stop|idle/.test(statusText)) return 'plannedStop'
  if (/正常|运行|normal|running/.test(statusText)) return 'production'

  return null
}

function selectDeviceStatus(devices: DeviceRealtimeItem[]) {
  const statusPriority: Record<CssMapDeviceStatus, number> = {
    abnormalStop: 5,
    changeover: 4,
    plannedStop: 3,
    cleaning: 2,
    production: 1,
    neutral: 0,
  }

  const statuses = devices
    .map(mapDeviceStatus)
    .filter((status): status is CssMapDeviceStatus => status !== null)
    .sort((left, right) => statusPriority[right] - statusPriority[left])[0] ?? null

  return statuses
}

function toPercentLoadRate(load: ScheduleDeviceLoadRecord) {
  const rawValue = Number(load.fuhe)
  if (!Number.isFinite(rawValue)) return null

  return Math.round(rawValue * 1000) / 10
}

function averageLoadRate(loads: ScheduleDeviceLoadRecord[]) {
  const values = loads
    .map(toPercentLoadRate)
    .filter((value): value is number => value !== null)

  if (values.length === 0) return null

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function createRuntimeFromApi(
  realtimeItems: DeviceRealtimeItem[],
  loadItems: ScheduleDeviceLoadRecord[],
): CssMapDeviceRuntime {
  const staffByKey = new Map<string, CssMapDeviceRuntime['staff'][number]>()
  const fiveMChangesByKey = new Map<string, CssMapDeviceRuntime['fiveMChanges'][number]>()

  function addFiveMChange(category: CssMapDeviceRuntime['fiveMChanges'][number]['category'], label: string | null | undefined) {
    const changeLabel = String(label ?? '').trim()
    if (!changeLabel) return

    const key = `${category}:${changeLabel}`
    if (fiveMChangesByKey.has(key)) return

    fiveMChangesByKey.set(key, {
      id: key,
      category,
      label: changeLabel,
    })
  }

  realtimeItems.forEach((item) => {
    item.onlinePersonList.forEach((person, index) => {
      const staffKey = [
        person.employeeId,
        person.employeeNumber,
        person.recordId,
        person.employeeName,
        `${item.deviceCode}-${index}`,
      ].find((value) => String(value ?? '').trim()) as string

      if (!staffByKey.has(staffKey)) {
        staffByKey.set(staffKey, {
          id: staffKey,
          name: person.employeeName,
          category: 'operator',
          shift: 'full',
        })
      }

      if (person.employeePauseStatus === 1) {
        addFiveMChange('man', person.employeePauseTypeName ?? person.employeePauseStatusName)
      }
    })

    addFiveMChange('machine', item.deviceParseTypeName)
  })

  return {
    status: selectDeviceStatus(realtimeItems),
    loadRate: averageLoadRate(loadItems),
    staff: Array.from(staffByKey.values()),
    fiveMChanges: Array.from(fiveMChangesByKey.values()),
  }
}

function formatMonth(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

async function loadCurrentMonthDeviceLoads() {
  const currentMonth = formatMonth(new Date())
  const currentResponse = await getScheduleDeviceLoadByMonth(currentMonth)

  return currentResponse.data.success ? currentResponse.data.data : []
}

export function createCssMapData(
  mapConfig: CssMapJsonConfig,
  apiRuntime: {
    realtimeItems: DeviceRealtimeItem[]
    loadItems: ScheduleDeviceLoadRecord[]
  },
): CssMapData {
  const realtimeLookup = createDeviceCodeLookup(
    apiRuntime.realtimeItems,
    (item) => item.deviceCode,
  )
  const loadLookup = createDeviceCodeLookup(
    apiRuntime.loadItems,
    (item) => item.devCode,
  )

  return {
    size: {
      width: mapConfig.source.imageWidth,
      height: mapConfig.source.imageHeight,
    },
    sections: mapConfig.sections.map((section) => ({
      process: section.id,
      labelKey: section.labelKey,
      points: section.points,
      stroke: section.stroke,
    })),
    devices: mapConfig.devices.map((device) => {
      const runtimeCodes = collectDeviceRuntimeCodes(device)

      return {
        id: device.id,
        name: device.name,
        section: device.section,
        x: device.x,
        y: device.y,
        w: device.width,
        h: device.height,
        deviceCode: device.deviceCode,
        deviceCodes: runtimeCodes,
        children: (device.children ?? []).map((child) => {
          const childCodes = [normalizeDeviceCode(child.deviceCode)].filter(Boolean)

          return {
            id: child.id,
            name: child.name,
            deviceCode: child.deviceCode,
            x: child.x,
            y: child.y,
            w: child.width,
            h: child.height,
            runtime: createRuntimeFromApi(
              getRecordsByDeviceCodes(realtimeLookup, childCodes),
              getRecordsByDeviceCodes(loadLookup, childCodes),
            ),
          }
        }),
        runtime: createRuntimeFromApi(
          getRecordsByDeviceCodes(realtimeLookup, runtimeCodes),
          getRecordsByDeviceCodes(loadLookup, runtimeCodes),
        ),
      }
    }),
  }
}

export async function loadCssMapData(): Promise<CssMapData> {
  const response = await fetch(FACTORY_MAP_CONFIG_URL)

  if (!response.ok) {
    throw new Error(`Failed to load ${FACTORY_MAP_CONFIG_URL}: ${response.status}`)
  }

  const mapConfig = await response.json() as CssMapJsonConfig

  try {
    const [realtimeResponse, loadItems] = await Promise.all([
      getDeviceRealtimeList(),
      loadCurrentMonthDeviceLoads(),
    ])

    const apiRuntime = {
      realtimeItems: realtimeResponse.data.success ? realtimeResponse.data.data : [],
      loadItems,
    }

    return createCssMapData(mapConfig, apiRuntime)
  } catch (error) {
    console.warn('Failed to load live css map runtime, using empty runtime.', error)
    return createCssMapData(mapConfig, {
      realtimeItems: [],
      loadItems: [],
    })
  }
}
