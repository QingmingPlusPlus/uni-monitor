import http from './http'
import type { ApiRecord, ApiResponse } from './http'

export interface ScheduleMonthParams {
  month: string
}

export interface ScheduleWorkhoursParams {
  date: string
  banci: string
}

export interface ScheduleMonthlyRecord {
  date: string
  shebei: string
  number: number
  process: string
  zhifan: string
  banci: string
  dept: number
}

export interface ScheduleDeviceLoadRecord {
  devCode?: string
  devName: string
  fuhe: number
}

export type ScheduleWorkhoursRecord = ApiRecord

export type ScheduleMonthlyResponse = ApiResponse<ScheduleMonthlyRecord[]>
export type ScheduleDeviceLoadResponse = ApiResponse<ScheduleDeviceLoadRecord[]>
export type ScheduleWorkhoursResponse = ApiResponse<ScheduleWorkhoursRecord[]>

export function getScheduleWorkhours(params: ScheduleWorkhoursParams) {
  return http.get<ScheduleWorkhoursResponse>('/schedule/getWorkhours', { params })
}

export function getSchedulePlanByMonth(month: string) {
  return http.get<ScheduleMonthlyResponse>('/schedule/getPlan', {
    params: { month } satisfies ScheduleMonthParams,
  })
}

export function getScheduleOutputByMonth(month: string) {
  return http.get<ScheduleMonthlyResponse>('/schedule/getOutput', {
    params: { month } satisfies ScheduleMonthParams,
  })
}

export function getScheduleDeviceLoadByMonth(month: string) {
  return http.get<ScheduleDeviceLoadResponse>('/schedule/getDeviceload', {
    params: { month } satisfies ScheduleMonthParams,
  })
}
