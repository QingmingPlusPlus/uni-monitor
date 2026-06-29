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

export interface ScheduleRukuPlanRecord {
  date: string
  banci: string
  shebei: string
  number: number
  zhifan: string
}

export interface ScheduleRejectsRecord {
  date: string
  banci: string
  shebei: string
  number: number
  zhifan: string
}

export interface ScheduleChangePointRecord {
  date?: string
  banci?: string
  dept?: number
  process?: string
  scope?: string
  device?: string
  type?: string
  change?: string
  varify?: string
  respStaff?: string
  confStaff?: string
  effect?: string
  notes?: string
}

export type ScheduleWorkhoursRecord = ApiRecord

export type ScheduleMonthlyResponse = ApiResponse<ScheduleMonthlyRecord[]>
export type ScheduleDeviceLoadResponse = ApiResponse<ScheduleDeviceLoadRecord[]>
export type ScheduleRukuPlanResponse = ApiResponse<ScheduleRukuPlanRecord[]>
export type ScheduleRejectsResponse = ApiResponse<ScheduleRejectsRecord[]>
export type ScheduleChangePointResponse = ApiResponse<ScheduleChangePointRecord[]>
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

export function getScheduleRukuPlanByMonth(month: string) {
  return http.get<ScheduleRukuPlanResponse>('/schedule/getRukuPlan', {
    params: { month } satisfies ScheduleMonthParams,
  })
}

export function getScheduleRejectsByMonth(month: string) {
  return http.get<ScheduleRejectsResponse>('/schedule/getRejects', {
    params: { month } satisfies ScheduleMonthParams,
  })
}

export function getScheduleChangePoint() {
  return http.get<ScheduleChangePointResponse>('/schedule/getChangePoint')
}
