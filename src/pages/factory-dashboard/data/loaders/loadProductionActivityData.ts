import { getDeviceRealtimeList } from '../../../../api/deviceRealtime'
import type { DeviceRealtimeItem } from '../../../../api/deviceRealtime'
import { getCssMapDepartmentLabel, getCssMapProcessLabel } from '../../../../components/css-map/css3dMapSelection'
import { mapRealtimeStatus } from '../../../../components/css-map/deviceRealtimeStatus'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import type {
  ProductionActivityData,
  ProductionActivityRow,
} from '../factoryDashboardTypes'
import { toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'
import { loadProcessDeviceCodeMap, normalizeDeviceCode } from './factoryMapConfigCache'

type ActivityDeviceStatus = 'running' | 'abnormal' | 'plannedStop' | 'neutral'

interface ProcessRealtimeData {
  readonly processType: CssMapProcessValue
  readonly apiItems: readonly DeviceRealtimeItem[]
  readonly scopedItems: readonly DeviceRealtimeItem[]
}

function mapRealtimeToActivityStatus(item: DeviceRealtimeItem): ActivityDeviceStatus {
  const status = mapRealtimeStatus(item)
  if (status === 'plannedStop') return 'plannedStop'
  if (status === 'abnormalStop') return 'abnormal'
  if (status === null) return 'neutral'
  return 'running'
}

async function loadRealtimeForApiProcess(
  department: CssMapDepartmentValue,
  apiProcessType: string,
): Promise<readonly DeviceRealtimeItem[]> {
  try {
    const response = await getDeviceRealtimeList({
      departmentId: toApiDepartmentCode(department),
      processType: apiProcessType,
    })
    return Array.isArray(response.data?.data) ? response.data.data : []
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DashboardLoader] 设备实时接口失败 (${apiProcessType}): ${error.message}`)
    }
    return []
  }
}

function filterRealtimeForProcess(
  items: readonly DeviceRealtimeItem[],
  processType: CssMapProcessValue,
  deviceCodeMap: Readonly<Record<string, ReadonlySet<string>>>,
): readonly DeviceRealtimeItem[] {
  const codeSet = deviceCodeMap[processType]
  if (codeSet === undefined || codeSet.size === 0) return items

  const filtered = items.filter((item) => codeSet.has(normalizeDeviceCode(item.deviceCode)))
  return filtered.length > 0 ? filtered : items
}

function deduplicateApiItems(results: readonly ProcessRealtimeData[]): readonly DeviceRealtimeItem[] {
  const uniqueItems = new Map<string, DeviceRealtimeItem>()

  results.forEach(({ apiItems }) => {
    apiItems.forEach((item, index) => {
      const deviceId = String(item.deviceId ?? '').trim()
      const deviceCode = normalizeDeviceCode(item.deviceCode)
      const key = deviceId
        ? `id:${deviceId}`
        : deviceCode
          ? `code:${deviceCode}`
          : `anonymous:${uniqueItems.size}:${index}`
      if (!uniqueItems.has(key)) uniqueItems.set(key, item)
    })
  })

  return [...uniqueItems.values()]
}

function createProductionActivityRow(
  department: CssMapDepartmentValue,
  processType: CssMapProcessValue,
  config: CssMapSelectionConfig,
  items: readonly DeviceRealtimeItem[],
  deviceCodeMap: Readonly<Record<string, ReadonlySet<string>>>,
): ProductionActivityRow {
  const codeSet = deviceCodeMap[processType]
  const totalCount = Math.max(items.length, codeSet?.size ?? 0)
  const statuses = items.map(mapRealtimeToActivityStatus)
  const plannedStopCount = statuses.filter((status) => status === 'plannedStop').length
  const abnormalCount = statuses.filter((status) => status === 'abnormal').length

  return {
    id: processType,
    departmentLabel: getCssMapDepartmentLabel(department, config),
    processLabel: getCssMapProcessLabel(processType, config),
    totalCount,
    runningCount: totalCount - plannedStopCount,
    abnormalCount,
    plannedStopCount,
  }
}

export async function loadProductionActivityData(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig,
): Promise<ProductionActivityData> {
  const deviceCodeMap = await loadProcessDeviceCodeMap()
  const apiRequests = new Map<string, Promise<readonly DeviceRealtimeItem[]>>()
  const results = await Promise.all(
    processTypes.map(async (processType) => {
      const apiProcessType = toApiProcessType(processType)
      let request = apiRequests.get(apiProcessType)
      if (request === undefined) {
        request = loadRealtimeForApiProcess(department, apiProcessType)
        apiRequests.set(apiProcessType, request)
      }

      const apiItems = await request
      return {
        processType,
        apiItems,
        scopedItems: filterRealtimeForProcess(apiItems, processType, deviceCodeMap),
      } satisfies ProcessRealtimeData
    }),
  )
  const summaryItems = deduplicateApiItems(results)
  const summaryStatuses = summaryItems.map(mapRealtimeToActivityStatus)

  return {
    title: '生产线稼动情况',
    summaryTotalCount: summaryItems.length,
    summaryRunningCount: summaryStatuses.filter((status) => status !== 'plannedStop').length,
    rows: results.map(({ processType, scopedItems }) =>
      createProductionActivityRow(department, processType, config, scopedItems, deviceCodeMap)),
  }
}
