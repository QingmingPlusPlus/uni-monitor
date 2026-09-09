import axios from 'axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '../../api/http'
import type { DailyReportQuery, ReportData } from '../../api/dailyReport'
import { hasIncompleteRows, validReportMeta } from './reportValidation'

export type SectionStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
export interface SectionState<T> {
  status: SectionStatus
  data: T | null
  message: string
}
export function initialSection<T>(): SectionState<T> { return { status: 'idle', data: null, message: '' } }

/** 每个分区独立取消和递增版本，刷新同一筛选也不会被旧响应覆盖。 */
export function createReportResource<Row>(
  fetcher: (query: DailyReportQuery, signal: AbortSignal) => Promise<AxiosResponse<ApiResponse<ReportData<Row>>>>,
  publish: (state: SectionState<ReportData<Row>>) => void,
  validateRows: (rows: Row[], query: DailyReportQuery) => boolean,
) {
  let version = 0
  let controller: AbortController | undefined
  return {
    async load(query: DailyReportQuery) {
      const current = ++version
      controller?.abort()
      controller = new AbortController()
      publish({ status: 'loading', data: null, message: '' })
      try {
        const response = await fetcher({ ...query }, controller.signal)
        if (current !== version) return
        const body = response.data
        if (body?.success !== true) {
          const unavailable = body?.code === 'NOT_IMPLEMENTED' || body?.code === 'NOT_CONNECTED'
          publish({ status: unavailable ? 'unavailable' : 'error', data: null,
            message: unavailable ? '数据未接入' : '查询失败，请重试' })
          return
        }
        const data = body.data
        const meta = data?.meta
        if (!meta || !validReportMeta(meta, query) ||
          !Array.isArray(data.rows) || !validateRows(data.rows, query)) {
          throw new Error('日报响应与查询范围或数据契约不一致')
        }
        const incomplete = meta.status === 'complete' && hasIncompleteRows(data.rows)
        const result = incomplete ? { ...data, meta: { ...meta, status: 'partial' as const,
          notes: [...meta.notes, '部分字段缺失、未完成或存在统计差异，请结合明细核对。'] } } : data
        publish({ status: meta.status === 'unavailable' ? 'unavailable' : 'ready', data: result, message: '' })
      } catch (error) {
        if (current !== version) return
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        const unavailable = status === 404 || status === 501
        publish({ status: unavailable ? 'unavailable' : 'error', data: null,
          message: unavailable ? '数据未接入' : '数据加载失败或返回格式不符合日报要求，请重试' })
      }
    },
    dispose() { version++; controller?.abort() },
  }
}
