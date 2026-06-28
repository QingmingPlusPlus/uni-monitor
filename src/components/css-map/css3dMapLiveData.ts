import type {
  CssMapDevice,
  CssMapDeviceRuntime,
  CssMapDeviceStatus,
  CssMapJsonConfig,
  CssMapJsonDevice,
  CssMapJsonDeviceChild,
  CssMapJsonSection,
  CssMapPoint,
  CssMapProcessBoundary,
  CssMapProcessValue,
  CssMapSize,
} from './css3dMapTypes'
import { getCssMapProcessLabel, isCssMapProcessValue } from './css3dMapSelection'

const factoryMapConfigUrls = [
  '/static/factory-map/devices.json',
  '/factory-map/devices.json',
] as const

const mockStatuses = [
  'production',
  'production',
  'plannedStop',
  'changeover',
  'abnormalStop',
  'cleaning',
  'neutral',
] as const satisfies readonly CssMapDeviceStatus[]

const mockFiveMCategories = ['man', 'machine', 'material', 'method', 'environment'] as const

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

function hashText(value: string): number {
  return Array.from(value).reduce((hash, char) => {
    const nextHash = (hash * 31 + char.charCodeAt(0)) % 9973
    return nextHash
  }, 17)
}

function createMockRuntime(seed: string): CssMapDeviceRuntime {
  const hash = hashText(seed)
  const status = mockStatuses[hash % mockStatuses.length] ?? 'neutral'
  const loadRate = Math.round((28 + (hash % 82) + ((hash % 7) / 10)) * 10) / 10
  const staffCount = hash % 3
  const fiveMCount = hash % 4 === 0 ? 1 : 0

  return {
    status,
    loadRate,
    staff: Array.from({ length: staffCount }, (_, index) => ({
      id: `${seed}-staff-${index + 1}`,
      name: `作业员${index + 1}`,
      category: 'operator',
      shift: index % 2 === 0 ? 'full' : 'short',
    })),
    fiveMChanges: Array.from({ length: fiveMCount }, (_, index) => {
      const category = mockFiveMCategories[(hash + index) % mockFiveMCategories.length] ?? 'machine'

      return {
        id: `${seed}-five-m-${index + 1}`,
        category,
        label: category === 'man' ? '人员短缺' : '状态偏离',
      }
    }),
  }
}

function createCssMapData(mapConfig: CssMapJsonConfig): CssMapData {
  return {
    size: {
      width: mapConfig.source.imageWidth,
      height: mapConfig.source.imageHeight,
    },
    sections: mapConfig.sections.map((section) => ({
      process: section.id,
      labelKey: getCssMapProcessLabel(section.id),
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
          runtime: createMockRuntime(child.deviceCode),
        })),
        runtime: createMockRuntime(runtimeCodes[0] ?? device.id),
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

export async function loadCssMapData(): Promise<CssMapData> {
  const errors: string[] = []

  for (const url of factoryMapConfigUrls) {
    try {
      const payload = await fetchFactoryMapConfig(url)

      if (!isCssMapJsonConfig(payload)) {
        throw new CssMapDataLoadError(`Factory map config shape is invalid: ${url}`)
      }

      return createCssMapData(payload)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unknown factory map load error: ${url}`)
    }
  }

  throw new CssMapDataLoadError(errors.join(' | '))
}
