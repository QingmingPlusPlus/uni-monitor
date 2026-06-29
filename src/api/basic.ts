import http from './http'
import type { ApiResponse } from './http'

export interface BasicMonthSegmentParams {
  /** 月份，格式 yyyy-MM */
  month: string
}

export interface SegmentVO {
  /** 分段序号 */
  segmentIndex: number
  /** 起始日 */
  startDay: number
  /** 结束日 */
  endDay: number
}

export interface MonthSegmentBaseVO {
  /** 配置ID，未配置时为空 */
  id?: string
  /** 科室ID */
  departmentId: string
  /** 工序类别 */
  processType: string
  /** 分段列表，未配置时为 null */
  segments: SegmentVO[] | null
}

export type MonthSegmentBaseResponse = ApiResponse<MonthSegmentBaseVO[]>

/**
 * 根据月份查询月份段基础数据
 *
 * 返回设备表中的科室+工序组合，并合并 month_segment_config 在该月份下的分段配置。
 */
export function getMonthSegmentBaseData(month: string) {
  return http.get<MonthSegmentBaseResponse>('/basic/month-segment/base-data', {
    params: { month } satisfies BasicMonthSegmentParams,
  })
}
