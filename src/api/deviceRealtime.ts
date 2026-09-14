import http from './http'
import type { ApiResponse } from './http'

export interface DeviceRealtimeListParams {
  deviceCode?: string
  /** 逗号分隔，最多 50 个编码。 */
  deviceCodes?: string
  deviceCodeLike?: string
  factoryId?: string
  departmentId?: string
  processType?: string
}

export interface DeviceRealtimeOnlinePerson {
  recordId: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  onlineTime: string
  onlineStatus: number
  onlineStatusName: string
  operationDeviceLevel: string | null
  operationDeviceLevelName: string | null
  employeePauseStatus: number
  employeePauseStatusName: string
  employeePauseTypeName: string | null
  employeePauseStartTime: string | null
}

export interface DeviceRealtimeProductionTask {
  id: string
  planId: string
  productionNumber: string
  planStatus: number
  planStatusDesc: string
  actualStartTime: string
  targetCount: number
  actualCount: number
  completionRate: string
}

export interface DeviceRealtimeItem {
  deviceId: string
  deviceCode: string
  deviceName: string
  deviceType: string | null
  deviceTypeName: string | null
  factoryId: string
  departmentId: string
  departmentName: string
  processType: string
  processTypeName: string
  procedureName: string
  scheduleMode: string
  deviceStatus: string
  deviceStatusName: string
  actualStatus: string
  actualStatusName: string
  deviceParseType: string | null
  deviceParseTypeName: string | null
  onlinePersonList: DeviceRealtimeOnlinePerson[]
  productionTaskList: DeviceRealtimeProductionTask[]
}

export type DeviceRealtimeListResponse = ApiResponse<DeviceRealtimeItem[]>

export function getDeviceRealtimeList(params?: DeviceRealtimeListParams) {
  return http.get<DeviceRealtimeListResponse>('/device/realtime/list', { params })
}

export interface DeviceTimeLineParams {
  deviceCode?: string
  /** yyyy-MM-dd */
  queryDate?: string
}

export interface DeviceTimeLineExtra {
  /** 保留 Swagger 的 filed 拼写。 */
  filedKey: string
  filedLabel: string
  /** 开放值尚未实测，不推断具体字段。 */
  filedValue: unknown
}

/** 设备时间轴：字段来自 Swagger，ID 和可空性尚待成功响应核验。 */
export interface DeviceTimeLineRecord {
  deviceId: string | number
  deviceCode: string
  deviceName: string
  departmentId: string
  departmentName: string
  processType: string
  processTypeName: string
  triggerTime: string
  triggerType: string
  startTime: string
  endTime: string | null
  extra: DeviceTimeLineExtra[]
}

export type DeviceTimeLineResponse = ApiResponse<DeviceTimeLineRecord[]>

export function getDeviceTimeLine(params: DeviceTimeLineParams) {
  return http.get<DeviceTimeLineResponse>('/device/device/timeLine', { params })
}
