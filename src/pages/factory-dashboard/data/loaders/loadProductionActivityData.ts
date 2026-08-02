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

function mapRealtimeToActivityStatus(item: DeviceRealtimeItem): ActivityDeviceStatus {
  const status = mapRealtimeStatus(item)
  if (status === 'plannedStop') return 'plannedStop'
  if (status === 'abnormalStop') return 'abnormal'
  if (status === null) return 'neutral'
  return 'running'
}

async function loadRealtimeForProcess(
  department: CssMapDepartmentValue,
  processType: CssMapProcessValue,
  deviceCodeMap: Readonly<Record<string, ReadonlySet<string>>>,
): Promise<readonly DeviceRealtimeItem[]> {
  try {
    const response = await getDeviceRealtimeList({
      departmentId: toApiDepartmentCode(department),
      processType: toApiProcessType(processType),
    })
    const data = Array.isArray(response.data?.data) ? response.data.data : []
    const codeSet = deviceCodeMap[processType]

    if (codeSet === undefined || codeSet.size === 0) {
      return data
    }

    const filtered = data.filter((item) => codeSet.has(normalizeDeviceCode(item.deviceCode)))
    return filtered.length > 0 ? filtered : data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[DashboardLoader] 设备实时接口失败 (${processType}): ${error.message}`)
    }
    return []
  }
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
  const rows = await Promise.all(
    processTypes.map(async (processType) => {
      const items = await loadRealtimeForProcess(department, processType, deviceCodeMap)
      return createProductionActivityRow(department, processType, config, items, deviceCodeMap)
    }),
  )

  return {
    title: '生产线稼动情况',
    rows,
  }
}
