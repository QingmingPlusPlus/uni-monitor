import type {
  CssMapJsonConfig,
  CssMapJsonDevice,
  CssMapJsonDeviceChild,
} from '../../../../components/css-map/css3dMapTypes'

const factoryMapConfigUrls = [
  '/static/factory-map/devices.json',
  '/factory-map/devices.json',
] as const

type ProcessDeviceCodeMap = Readonly<Record<string, ReadonlySet<string>>>

let deviceCodeMapPromise: Promise<ProcessDeviceCodeMap> | null = null

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCssMapJsonDeviceChild(value: unknown): value is CssMapJsonDeviceChild {
  return (
    isRecord(value) &&
    typeof value.deviceCode === 'string'
  )
}

function isCssMapJsonDevice(value: unknown): value is CssMapJsonDevice {
  return (
    isRecord(value) &&
    (value.section === null || typeof value.section === 'string') &&
    (value.deviceCode === undefined || typeof value.deviceCode === 'string') &&
    (value.deviceCodes === undefined || (Array.isArray(value.deviceCodes) && value.deviceCodes.every((code) => typeof code === 'string'))) &&
    (value.children === undefined || (Array.isArray(value.children) && value.children.every(isCssMapJsonDeviceChild)))
  )
}

function isCssMapJsonConfig(value: unknown): value is CssMapJsonConfig {
  return isRecord(value) && Array.isArray(value.devices) && value.devices.every(isCssMapJsonDevice)
}

export function normalizeDeviceCode(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function addDeviceCode(set: Set<string>, code: string | null | undefined): void {
  const normalized = normalizeDeviceCode(code)
  if (!normalized) return
  set.add(normalized)
}

function collectDeviceCodes(device: CssMapJsonDevice): readonly string[] {
  const codes = new Set<string>()
  addDeviceCode(codes, device.deviceCode)
  device.deviceCodes?.forEach((code) => addDeviceCode(codes, code))
  device.children?.forEach((child) => addDeviceCode(codes, child.deviceCode))
  return [...codes]
}

async function fetchFactoryMapConfig(url: string): Promise<CssMapJsonConfig> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`地图设备配置加载失败: ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!isCssMapJsonConfig(payload)) {
    throw new Error('地图设备配置格式不正确')
  }

  return payload
}

async function loadFactoryMapConfig(): Promise<CssMapJsonConfig> {
  const errors: string[] = []
  for (const url of factoryMapConfigUrls) {
    try {
      return await fetchFactoryMapConfig(url)
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join(' | '))
}

function createProcessDeviceCodeMap(config: CssMapJsonConfig): ProcessDeviceCodeMap {
  const map: Record<string, Set<string>> = {}
  for (const device of config.devices) {
    if (typeof device.section !== 'string') continue
    const set = map[device.section] ?? new Set<string>()
    collectDeviceCodes(device).forEach((code) => set.add(code))
    map[device.section] = set
  }

  return map
}

export async function loadProcessDeviceCodeMap(): Promise<ProcessDeviceCodeMap> {
  if (deviceCodeMapPromise !== null) return deviceCodeMapPromise

  const request = loadFactoryMapConfig()
    .then(createProcessDeviceCodeMap)
    .catch((error: unknown) => {
      if (error instanceof Error) {
        console.warn(`[DashboardLoader] 地图设备范围加载失败: ${error.message}`)
      }
      return {}
    })
    .finally(() => {
      if (deviceCodeMapPromise === request) deviceCodeMapPromise = null
    })

  deviceCodeMapPromise = request
  return request
}
