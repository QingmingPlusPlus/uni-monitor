import axios from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createScheduledAdapter } from './requestScheduler'

function setup() {
  const started: string[] = []
  const completions: (() => void)[] = []
  const transport: AxiosAdapter = config => new Promise(resolve => {
    started.push(config.url!)
    completions.push(() => resolve({ data: null, status: 200, statusText: 'OK', headers: {}, config }))
  })
  const adapter = createScheduledAdapter(transport)
  const request = (url: string, signal?: AbortSignal) => adapter({ url, signal } as InternalAxiosRequestConfig)
  return { started, completions, request }
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('请求调度', () => {
  it('慢普通请求占满配额时，变化点仍可立即发送', async () => {
    const s = setup()
    const requests = ['/a', '/b', '/c', '/queued', '/schedule/getChangePoint'].map(url => s.request(url))
    await flush()
    expect(s.started).toEqual(['/a', '/b', '/c', '/schedule/getChangePoint'])
    s.completions[0]()
    s.completions[1]()
    await flush()
    expect(s.started).toContain('/queued')
    s.completions.forEach(done => done())
    await Promise.all(requests)
  })

  it('跨批次的设备月工时最多占两个位置', async () => {
    const s = setup()
    const bulk = '/device/availability/month/daily-net'
    const requests = [bulk, bulk, bulk, bulk, '/attendance', '/schedule/getChangePoint'].map(url => s.request(url))
    await flush()
    expect(s.started).toEqual([bulk, bulk, '/attendance', '/schedule/getChangePoint'])
    s.completions.forEach(done => done())
    await flush()
    s.completions.forEach(done => done())
    await Promise.all(requests)
  })

  it('排队中的请求取消后不再发送', async () => {
    const s = setup()
    const running = ['/a', '/b', '/c'].map(url => s.request(url))
    const controller = new AbortController()
    const queued = s.request('/cancelled', controller.signal).catch(error => error)
    controller.abort()
    expect(axios.isCancel(await queued)).toBe(true)
    await flush()
    s.completions.forEach(done => done())
    await Promise.all(running)
    expect(s.started).not.toContain('/cancelled')
  })

  it('传输失败会释放位置，不会堵住后续请求', async () => {
    const transport = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('timeout'))
    const adapter = createScheduledAdapter(transport)
    await Promise.allSettled(Array.from({ length: 8 }, (_, i) => adapter({ url: `/${i}` } as InternalAxiosRequestConfig)))
    expect(transport).toHaveBeenCalledTimes(8)
  })
})
