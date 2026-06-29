import http from './http'
import type { ApiResponse } from './http'

export interface AttendanceMonthlyParams {
  /** 月份，格式 yyyy-MM */
  month: string
  /** 科室 1-4 */
  department?: string
  /** 工序 preprocessing:前处理 sulfur_addition:加硫 post_processing:后处理 */
  processType?: string
}

export interface AttendanceCurrentParams {
  /** 查询的日期 YYYY-MM-dd */
  date?: string
  /** 科室 1-4 */
  department?: string
  /** 工序 preprocessing:前处理 sulfur_addition:加硫 post_processing:后处理 */
  processType?: string
}

/** 工时 */
export interface WorkHour {
  workHourType: string
  workHour: string
}

/** 月度每日出勤统计 */
export interface MonthlyAttendanceStatisticsVO {
  /** 日期，格式 yyyy-MM-dd */
  statDate: string
  /** 直接排班人数 */
  directSchedulePersonCount: number
  /** 间接排班人数 */
  indirectSchedulePersonCount: number
  /** 直接出勤人数 */
  directAttendancePersonCount: number
  /** 直接出勤率（%） */
  directAttendanceRate: number
}

/** 实时出勤情况数据 */
export interface CurrentAttendanceStatisticsVO {
  /** 班次 */
  shiftType: string
  /** 班次名称 */
  shiftTypeName: string
  /** 职务主键 */
  positionId: string
  /** 职务名称 */
  positionName: string
  /** 排版人数（在籍人数） */
  schedulePersonCount: number
  /** 出勤人数 */
  actualAttendancePersonCount: number
  /** 职务类型 直接(direct)-间接(indirect) */
  positionType: string
}

/** 当日出勤明细及状态 */
export interface AttendanceDetailSituationVO {
  /** 班次 */
  shiftName: string
  /** 工号 */
  account: string
  /** 姓名 */
  realName: string
  /** 职务 */
  positionName: string
  /** 工种 */
  workTypeName: string
  /** 出勤情况 */
  attendanceSituation: string
  /** 出勤状态 */
  attendanceStatus: string
  /** 能力 */
  ability: string
  /** 工时列表（分为 定时 平日 休日 祝日(节假日)） */
  workHourList: WorkHour[]
}

export type MonthlyAttendanceStatisticsResponse = ApiResponse<MonthlyAttendanceStatisticsVO[]>
export type CurrentAttendanceStatisticsResponse = ApiResponse<CurrentAttendanceStatisticsVO[]>
export type AttendanceDetailSituationResponse = ApiResponse<AttendanceDetailSituationVO[]>

/**
 * 根据月份、科室、工序查询每日出勤概况
 *
 * 返回本月每天的直接排班人数、间接排班人数、直接出勤人数和直接出勤率。
 */
export function getMonthlyAttendanceSituation(params: AttendanceMonthlyParams) {
  return http.get<MonthlyAttendanceStatisticsResponse>(
    '/attendance/monthlyAttendanceSituation',
    { params },
  )
}

/**
 * 根据科室及工序查询实时考勤状况
 *
 * 返回考勤表中的科室+工序的实际排班数及实际出勤数。
 */
export function getAttendanceSituation(params: AttendanceCurrentParams) {
  return http.get<CurrentAttendanceStatisticsResponse>(
    '/attendance/attendanceSituation',
    { params },
  )
}

/**
 * 当日考勤详情状况
 *
 * 返回当天的 班次 工号 姓名 职务 出勤状况 出勤状态 能力 工时列表
 * （分为 定时 平日 休日 祝日(节假日)）。
 */
export function getAttendanceDetailSituation(params: AttendanceCurrentParams) {
  return http.get<AttendanceDetailSituationResponse>(
    '/attendance/attendanceDetailSituation',
    { params },
  )
}
