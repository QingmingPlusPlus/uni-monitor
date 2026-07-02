import type {
  DeviceRealtimeItem,
  DeviceRealtimeOnlinePerson,
} from '../../api/deviceRealtime'
import { getDeviceRealtimeList } from '../../api/deviceRealtime'
import type {
  ScheduleChangePointRecord,
  ScheduleDeviceLoadRecord,
} from '../../api/schedule'
import {
  getScheduleChangePoint,
  getScheduleDeviceLoadByMonth,
} from '../../api/schedule'
import type {
  CssMapDevice,
  CssMapDeviceRuntime,
  CssMapDeviceStatus,
  CssMapFiveMCategory,
  CssMapJsonConfig,
  CssMapJsonDevice,
  CssMapJsonDeviceChild,
  CssMapJsonSection,
  CssMapPoint,
  CssMapProcessBoundary,
  CssMapProcessValue,
  CssMapSelectionConfig,
  CssMapSize,
} from './css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  getCssMapProcessLabel,
  isCssMapProcessValue,
} from './css3dMapSelection'
import { mapRealtimeStatus } from './deviceRealtimeStatus'

const factoryMapConfigUrls = [
  '/static/factory-map/devices.json',
  '/factory-map/devices.json',
] as const

export class CssMapDataLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CssMapDataLoadError'
  }
}

export interface CssMapData {
  readonly size: CssMapSize
  readonly sections: readonly CssMapProcessBoundary[]
  readonly devices: readonly CssMapDevice[]
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPoint(value: unknown): value is CssMapPoint {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number'
}

function isDeviceChild(value: unknown): value is CssMapJsonDeviceChild {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.deviceCode === 'string' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  )
}

function isDevice(value: unknown): value is CssMapJsonDevice {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.width !== 'number' ||
    typeof value.height !== 'number'
  ) {
    return false
  }

  const section = value.section
  const children = value.children
  const deviceCodes = value.deviceCodes

  return (
    (section === null || isCssMapProcessValue(typeof section === 'string' ? section : undefined)) &&
    (value.deviceCode === undefined || typeof value.deviceCode === 'string') &&
    (deviceCodes === undefined || (Array.isArray(deviceCodes) && deviceCodes.every((code) => typeof code === 'string'))) &&
    (children === undefined || (Array.isArray(children) && children.every(isDeviceChild)))
  )
}

function isSection(value: unknown): value is CssMapJsonSection {
  return (
    isRecord(value) &&
    isCssMapProcessValue(typeof value.id === 'string' ? value.id : undefined) &&
    typeof value.stroke === 'string' &&
    Array.isArray(value.points) &&
    value.points.every(isPoint)
  )
}

function isCssMapJsonConfig(value: unknown): value is CssMapJsonConfig {
  return (
    isRecord(value) &&
    isRecord(value.source) &&
    typeof value.source.imageWidth === 'number' &&
    typeof value.source.imageHeight === 'number' &&
    value.source.coordinateOrigin === 'top-left' &&
    value.source.unit === 'px' &&
    Array.isArray(value.sections) &&
    value.sections.every(isSection) &&
    Array.isArray(value.devices) &&
    value.devices.every(isDevice)
  )
}

function normalizeDeviceCode(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function appendUniqueDeviceCode(codes: string[], code: string | null | undefined): void {
  const normalizedCode = normalizeDeviceCode(code)
  if (!normalizedCode || codes.includes(normalizedCode)) return
  codes.push(normalizedCode)
}

function collectDeviceRuntimeCodes(device: CssMapJsonDevice): string[] {
  const codes: string[] = []
  appendUniqueDeviceCode(codes, device.deviceCode)
  device.deviceCodes?.forEach((code) => appendUniqueDeviceCode(codes, code))
  device.children?.forEach((child) => appendUniqueDeviceCode(codes, child.deviceCode))
  return codes
}

function createEmptyRuntime(): CssMapDeviceRuntime {
  return {
    status: null,
    loadRate: null,
    staff: [],
    fiveMChanges: [],
  }
}

function getCurrentMonthParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function chunkArray<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function indexByDeviceCode<T>(items: readonly T[], codeSelector: (item: T) => string | null | undefined): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    const code = normalizeDeviceCode(codeSelector(item))
    if (!code || map.has(code)) continue
    map.set(code, item)
  }
  return map
}

function mapRealtimeStaff(person: DeviceRealtimeOnlinePerson, fallbackIndex: number): CssMapDeviceRuntime['staff'][number] {
  const id = String(person.recordId || person.employeeId || person.employeeNumber || fallbackIndex)
  const name = person.employeeName || person.employeeNumber || `人员${fallbackIndex + 1}`

  return {
    id,
    name,
    category: 'operator',
    shift: person.employeePauseStatus === 1 ? 'short' : 'full',
  }
}

function normalizeFiveMCategory(value: string | null | undefined): CssMapFiveMCategory {
  const text = String(value ?? '').trim()
  if (text.includes('人')) return 'man'
  if (text.includes('机')) return 'machine'
  if (text.includes('料')) return 'material'
  if (text.includes('法')) return 'method'
  if (text.includes('环')) return 'environment'
  return 'machine'
}

function createFiveMChange(record: ScheduleChangePointRecord, index: number): CssMapDeviceRuntime['fiveMChanges'][number] {
  return {
    id: `${record.device ?? 'scope'}-${record.type ?? 'change'}-${index}`,
    category: normalizeFiveMCategory(record.type),
    label: record.change || record.varify || record.notes || record.type || '变化点',
  }
}

function resolveAggregateStatus(statuses: readonly (CssMapDeviceStatus | null)[]): CssMapDeviceStatus | null {
  const ranking: readonly CssMapDeviceStatus[] = [
    'abnormalStop',
    'changeover',
    'cleaning',
    'plannedStop',
    'production',
    'neutral',
  ]

  for (const status of ranking) {
    if (statuses.includes(status)) return status
  }

  return null
}

function dedupeStaff(staff: readonly CssMapDeviceRuntime['staff'][number][]): CssMapDeviceRuntime['staff'] {
  const seen = new Set<string>()
  const result: CssMapDeviceRuntime['staff'][number][] = []

  for (const item of staff) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }

  return result
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

function normalizeLoadRate(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value <= 2 ? value * 100 : value
}

async function loadRealtimeItems(deviceCodes: readonly string[]): Promise<readonly DeviceRealtimeItem[]> {
  const chunks = chunkArray(deviceCodes, 50)
  const results = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const response = await getDeviceRealtimeList({ deviceCodes: chunk.join(',') })
      return Array.isArray(response.data?.data) ? response.data.data : []
    }),
  )

  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
}

async function loadDeviceLoadRecords(): Promise<readonly ScheduleDeviceLoadRecord[]> {
  try {
    const response = await getScheduleDeviceLoadByMonth(getCurrentMonthParam())
    return Array.isArray(response.data?.data) ? response.data.data : []
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[CssMap] 设备负荷接口失败: ${error.message}`)
    }
    return []
  }
}

async function loadChangePointRecords(): Promise<readonly ScheduleChangePointRecord[]> {
  try {
    const response = await getScheduleChangePoint()
    return Array.isArray(response.data?.data) ? response.data.data : []
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[CssMap] 变化点接口失败: ${error.message}`)
    }
    return []
  }
}

interface RuntimeLookup {
  readonly realtimeByCode: ReadonlyMap<string, DeviceRealtimeItem>
  readonly loadByCode: ReadonlyMap<string, ScheduleDeviceLoadRecord>
  readonly changesByCode: ReadonlyMap<string, readonly ScheduleChangePointRecord[]>
}

function createChangeLookup(records: readonly ScheduleChangePointRecord[]): Map<string, ScheduleChangePointRecord[]> {
  const map = new Map<string, ScheduleChangePointRecord[]>()

  records.forEach((record) => {
    const code = normalizeDeviceCode(record.device)
    if (!code) return
    const list = map.get(code) ?? []
    list.push(record)
    map.set(code, list)
  })

  return map
}

async function loadRuntimeLookup(deviceCodes: readonly string[]): Promise<RuntimeLookup> {
  const [realtimeItems, loadRecords, changeRecords] = await Promise.all([
    loadRealtimeItems(deviceCodes),
    loadDeviceLoadRecords(),
    loadChangePointRecords(),
  ])

  return {
    realtimeByCode: indexByDeviceCode(realtimeItems, (item) => item.deviceCode),
    loadByCode: indexByDeviceCode(loadRecords, (item) => item.devCode),
    changesByCode: createChangeLookup(changeRecords),
  }
}

function createRuntimeForCode(code: string, lookup: RuntimeLookup): CssMapDeviceRuntime {
  const normalizedCode = normalizeDeviceCode(code)
  const realtime = lookup.realtimeByCode.get(normalizedCode)
  const load = normalizeLoadRate(lookup.loadByCode.get(normalizedCode)?.fuhe)
  const changes = lookup.changesByCode.get(normalizedCode) ?? []

  return {
    status: mapRealtimeStatus(realtime),
    loadRate: load,
    staff: (realtime?.onlinePersonList ?? []).map(mapRealtimeStaff),
    fiveMChanges: changes.map(createFiveMChange),
  }
}

function mergeRuntimeForCodes(codes: readonly string[], lookup: RuntimeLookup): CssMapDeviceRuntime {
  if (codes.length === 0) return createEmptyRuntime()

  const runtimes = codes.map((code) => createRuntimeForCode(code, lookup))
  const loadRate = average(
    runtimes
      .map((runtime) => runtime.loadRate)
      .filter((value): value is number => value !== null),
  )

  return {
    status: resolveAggregateStatus(runtimes.map((runtime) => runtime.status)),
    loadRate,
    staff: dedupeStaff(runtimes.flatMap((runtime) => runtime.staff)),
    fiveMChanges: runtimes.flatMap((runtime) => runtime.fiveMChanges),
  }
}

async function createCssMapData(
  mapConfig: CssMapJsonConfig,
  selectionConfig: CssMapSelectionConfig,
): Promise<CssMapData> {
  const runtimeCodes = mapConfig.devices.flatMap(collectDeviceRuntimeCodes)
  const runtimeLookup = await loadRuntimeLookup(runtimeCodes)

  return {
    size: {
      width: mapConfig.source.imageWidth,
      height: mapConfig.source.imageHeight,
    },
    sections: mapConfig.sections.map((section) => ({
      process: section.id,
      labelKey: getCssMapProcessLabel(section.id, selectionConfig),
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
        children: (device.children ?? []).map((child) => ({
          id: child.id,
          name: child.name,
          deviceCode: child.deviceCode,
          x: child.x,
          y: child.y,
          w: child.width,
          h: child.height,
          runtime: createRuntimeForCode(child.deviceCode, runtimeLookup),
        })),
        runtime: mergeRuntimeForCodes(runtimeCodes, runtimeLookup),
      }
    }),
  }
}

async function fetchFactoryMapConfig(url: string): Promise<unknown> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new CssMapDataLoadError(`Failed to load factory map config ${url}: ${response.status}`)
  }

  return response.json()
}

export async function loadCssMapData(
  selectionConfig: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): Promise<CssMapData> {
  const errors: string[] = []

  for (const url of factoryMapConfigUrls) {
    try {
      const payload = await fetchFactoryMapConfig(url)

      if (!isCssMapJsonConfig(payload)) {
        throw new CssMapDataLoadError(`Factory map config shape is invalid: ${url}`)
      }

      return createCssMapData(payload, selectionConfig)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unknown factory map load error: ${url}`)
    }
  }

  throw new CssMapDataLoadError(errors.join(' | '))
}
