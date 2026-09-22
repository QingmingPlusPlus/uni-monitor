import http from './http'
import type { ApiRecord, ApiResponse } from './http'

export interface ScheduleMonthParams {
  month: string
}

export interface ScheduleRejectsParams extends ScheduleMonthParams {
  /** 可选数据日 YYYY-MM-DD；省略时查询整月，month 始终必填。 */
  date?: string
}

export interface ScheduleWorkhoursParams {
  date: string
  banci: string
}

export interface ScheduleShijiByDateParams {
  /** 日期 yyyy-MM-dd */
  date: string
  /** 设备编码；该接口的参数名是 device。 */
  device: string
}

export interface ScheduleMonthlyRecord {
  date?: string
  workDate?: string
  shebei?: string
  number: number
  /** 该条生产计划的计划 MH；仅 getPlan 提供，缺失时不能按 0 处理。 */
  mh?: number | null
  process?: string
  zhifan: string
  banci: string
  dept?: number | string
}

export interface ScheduleDeviceLoadRecord {
  devCode?: string
  devName: string
  /** 小数比例；Swagger 文字示例为字符串，非空响应尚待验证。 */
  fuhe: number | string
}

export interface ScheduleRukuPlanRecord {
  date: string
  number: number
  zhifan?: string
  dept?: number | string | null
  customer?: string
  banci?: string
  shebei?: string
}

export interface ScheduleRukuShijiRecord {
  date: string
  shebei?: string
  number: number
  zhifan?: string
  banci?: string
  cusCode?: string
  dept?: number | string
  custName?: string
}

export interface ScheduleRejectsRecord {
  date: string
  banci: string
  shebei: string
  number: number | string
  zhifan: string
  /** 仅“不良”计入不良数量及现象；其他明确类型仍计入废弃。 */
  type?: string
  /** 后端确认的不良现象名称；缺失时不得用 type 替代。 */
  yuanyin?: string | null
}

/** 2026-09-14 非空响应核验；device=null 的非设备关联情况来自 Swagger 说明。 */
export interface ScheduleChangePointRecord {
  /** 2026-09-18 用户确认：0 为进行中；地图只展示该状态。 */
  status?: number | string | null
  /** 开始班次；2026-09-20 Swagger描述及非空响应已确认，缺失时保留空值。 */
  banci?: string | null
  /** 解除日期；空字符串表示不显示解除日期。 */
  endDate?: string | null
  pid?: string | number
  date?: string
  factory?: string
  process?: string
  device?: string | null
  type?: string
  changePointContent?: string
  potentialRisk?: string
  implMethod?: string
  implResult?: string
  respPerson?: string
  reviewer?: string
  notes?: string
}

/** 查询工作时长图形类型，不提供工时数值。 */
export interface ScheduleWorkhoursRecord {
  shebei: string
  /** Swagger 说明：1 半圆形、0 扇形；实测为字符串。 */
  type: string
}

/** Swagger 标记“未完成”，实测仅空数组，不推断元素字段。 */
export type ScheduleShijiByDateRecord = ApiRecord
export type ScheduleShijiByDateResponse = ApiResponse<ScheduleShijiByDateRecord[]>

export function getScheduleShijiByDate(params: ScheduleShijiByDateParams) {
  return http.get<ScheduleShijiByDateResponse>('/schedule/getShijiByDate', { params })
}

export type ScheduleMonthlyResponse = ApiResponse<ScheduleMonthlyRecord[]>
export type ScheduleDeviceLoadResponse = ApiResponse<ScheduleDeviceLoadRecord[]>
export type ScheduleRukuPlanResponse = ApiResponse<ScheduleRukuPlanRecord[]>
export type ScheduleRukuShijiResponse = ApiResponse<ScheduleRukuShijiRecord[]>
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

export function getScheduleRukuShijiByMonth(month: string) {
  return http.get<ScheduleRukuShijiResponse>('/schedule/getRukuShiji', {
    params: { month } satisfies ScheduleMonthParams,
  })
}

export function getScheduleRejectsByMonth(month: string, date?: string) {
  return http.get<ScheduleRejectsResponse>('/schedule/getRejects', {
    params: { month, ...(date ? { date } : {}) } satisfies ScheduleRejectsParams,
  })
}

export interface ScheduleChangePointParams {
  /** 不传则不限制科室；与 process 均省略时查询全部范围。 */
  dept?: string
  process?: string
  /** 2026-09-20新增声明；空值查询全部，本次仅验证可省略，未验证筛选行为。 */
  beginDate?: string
  endDate?: string
  banci?: string
  progress: '' | '0' | '1'
}

export function getScheduleChangePoint(params: ScheduleChangePointParams) {
  return http.get<ScheduleChangePointResponse>('/schedule/getChangePoint', { params, timeout: 15000 })
}
