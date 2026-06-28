import http from './http'
import type { ApiResponse } from './http'

export interface DeviceRealtimeListParams {
  deviceCode?: string
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
