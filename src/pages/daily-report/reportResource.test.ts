import { describe, expect, it } from 'vitest'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '../../api/http'
import type { ProductionReport } from '../../api/dailyReport'
import { createReportResource } from './reportResource'
import type { SectionState } from './reportResource'
import { fixtures, query } from './reportFixtures.test-support'
import { validProduction } from './reportValidation'

const response = (data = fixtures().production) => ({ data: { success: true, code: '0', message: '', data } }) as AxiosResponse<ApiResponse<ProductionReport>>
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
describe('日报分区请求', () => {
  it('快速切换时取消旧请求并忽略旧响应，重复刷新同样受保护', async () => {
    const first = deferred<ReturnType<typeof response>>()
    const second = deferred<ReturnType<typeof response>>()
    const states: SectionState<ProductionReport>[] = []
    const signals: AbortSignal[] = []
    const resource = createReportResource((_query, signal) => {
      signals.push(signal)
      return signals.length === 1 ? first.promise : second.promise
    }, state => states.push(state), validProduction)
    const old = resource.load(query)
    const current = resource.load({ ...query, department: '2' })
    second.resolve(response({ ...fixtures().production, meta: { ...fixtures().production.meta, department: '2' } }))
    await current
    first.resolve(response())
    await old
    expect(signals[0].aborted).toBe(true)
    expect(states.map(state => state.status)).toEqual(['loading', 'loading', 'ready'])
    expect(states[2].data?.meta.department).toBe('2')
  })
  it('错误分区不影响成功分区，404/501及业务未接入区别于网络错误', async () => {
    const outcomes: string[] = []
    const success = createReportResource(async () => response(), state => outcomes.push(`ok:${state.status}`), validProduction)
    const missing = createReportResource(async () => { throw { isAxiosError: true, response: { status: 404 } } }, state => outcomes.push(`missing:${state.status}`), validProduction)
    const failed = createReportResource(async () => { throw new Error('network') }, state => outcomes.push(`failed:${state.status}`), validProduction)
    await Promise.allSettled([success.load(query), missing.load(query), failed.load(query)])
    expect(outcomes).toContain('ok:ready')
    expect(outcomes).toContain('missing:unavailable')
    expect(outcomes).toContain('failed:error')
    const business = createReportResource(async () => ({ ...response(), data: { ...response().data, success: false, code: 'NOT_CONNECTED' } }), state => outcomes.push(state.status), validProduction)
    await business.load(query)
    expect(outcomes.at(-1)).toBe('unavailable')
  })
  it('拒绝200状态的HTML或不同日期响应；空数组是有效空数据', async () => {
    for (const data of [null, '<html>fallback</html>', { ...fixtures().production, meta: { ...fixtures().production.meta, date: '2026-08-11' } }]) {
      const statuses: string[] = []
      const resource = createReportResource(async () => response(data as ProductionReport), state => statuses.push(state.status), validProduction)
      await resource.load(query)
      expect(statuses).toEqual(['loading', 'error'])
    }
    const statuses: string[] = []
    const resource = createReportResource(async () => response({ ...fixtures().production, rows: [] }), state => statuses.push(state.status), validProduction)
    await resource.load(query)
    expect(statuses).toEqual(['loading', 'ready'])
  })
  it('卸载后不会再发布数据，重试清空旧分区数据', async () => {
    const pending = deferred<ReturnType<typeof response>>()
    const states: string[] = []
    const resource = createReportResource(() => pending.promise, state => states.push(state.status), validProduction)
    const request = resource.load(query)
    resource.dispose()
    pending.resolve(response())
    await request
    expect(states).toEqual(['loading'])
  })
})
