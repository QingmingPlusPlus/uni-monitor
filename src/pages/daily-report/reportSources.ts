import { CanceledError, isAxiosError } from 'axios'
import type { ApiRecord, ApiResponse } from '../../api/http'
import { getReportPlanSource, getReportOutputSource, getReportRejectsSource, getReportDeviceSource, type DailyReportQuery } from '../../api/dailyReport'

export interface ReportSource {
  records: ApiRecord[] | null
  note: string
  incompleteScope?: boolean
}

interface Pending {
  controller: AbortController
  promise: Promise<ReportSource>
  users: number
}
const pending = new Map<string, Pending>()
const object = (value: unknown): value is ApiRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

/** 仅复用进行中的来源请求；单区重试不会读取已完成缓存，最后一个订阅者取消时停止网络请求。 */
function sharedSource(
  key: string, label: string,
  fetcher: (signal: AbortSignal) => Promise<{ data: ApiResponse<unknown> }>,
  signal?: AbortSignal,
): Promise<ReportSource> {
  if (signal?.aborted) return Promise.reject(new CanceledError())
  let entry = pending.get(key)
  if (!entry) {
    const controller = new AbortController()
    const created: Pending = { controller, users: 0, promise: Promise.resolve({ records: null, note: '' }) }
    created.promise = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(controller.signal)
        if (response.data?.success !== true || !Array.isArray(response.data.data)) {
          return { records: null, note: `${label}暂不可用或数据格式异常，请重试。` }
        }
        const records = response.data.data.filter(object)
        const invalidCount = response.data.data.length - records.length
        if (invalidCount && !records.length) return { records: null, note: `${label}记录格式异常，请重试。` }
        return { records, incompleteScope: invalidCount > 0,
          note: invalidCount ? `${label}有 ${invalidCount} 条记录格式异常，已保留有效记录；合计仅供核对。` : '' }
      } catch (error) {
        const timeout = isAxiosError(error) && ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')
        return { records: null, note: `${label}读取${timeout ? '超时' : '失败'}，请重试。` }
      }
    }).finally(() => { if (pending.get(key) === created) pending.delete(key) })
    pending.set(key, created)
    entry = created
  }
  const current = entry
  current.users++
  return new Promise((resolve, reject) => {
    let done = false
    function release() {
      done = true
      signal?.removeEventListener('abort', cancel)
      current.users--
    }
    function cancel() {
      if (done) return
      release()
      if (current.users === 0) {
        current.controller.abort()
        if (pending.get(key) === current) pending.delete(key)
      }
      reject(new CanceledError())
    }
    signal?.addEventListener('abort', cancel, { once: true })
    current.promise.then(result => { if (!done) { release(); resolve(result) } })
  })
}

export function reportScheduleSources(query: DailyReportQuery, signal?: AbortSignal, includeRejects = true) {
  const month = query.date.slice(0, 7)
  return Promise.all([
    sharedSource(`plan:${month}`, '生产计划', abort => getReportPlanSource(month, abort), signal),
    sharedSource(`output:${month}`, '生产实绩', abort => getReportOutputSource(month, abort), signal),
    includeRejects ? sharedSource(`rejects:${month}`, '不良记录', abort => getReportRejectsSource(month, abort), signal)
      : Promise.resolve({ records: null, note: '' } as ReportSource),
  ])
}

export function reportDeviceSource(query: DailyReportQuery, signal?: AbortSignal) {
  return sharedSource(`devices:${JSON.stringify(query)}`, '设备时长与阻碍',
    abort => getReportDeviceSource({ day: query.date, departmentId: query.department, processType: query.processType }, abort), signal)
}
