import { beforeEach, describe, expect, it, vi } from 'vitest'
import http from './http'
import { getScheduleRejectsByMonth } from './schedule'
import { getReportRejectsSource } from './dailyReport'

vi.mock('./http', () => ({ default: { get: vi.fn() } }))

describe('不良查询参数', () => {
  beforeEach(() => vi.clearAllMocks())

  it('月查询保持兼容，日查询始终同时携带month和date', () => {
    getScheduleRejectsByMonth('2026-09')
    expect(http.get).toHaveBeenLastCalledWith('/schedule/getRejects', { params: { month: '2026-09' } })
    getScheduleRejectsByMonth('2026-09', '2026-09-21')
    expect(http.get).toHaveBeenLastCalledWith('/schedule/getRejects', { params: { month: '2026-09', date: '2026-09-21' } })
    const signal = new AbortController().signal
    getReportRejectsSource({ month: '2026-09', date: '2026-09-21' }, signal)
    expect(http.get).toHaveBeenLastCalledWith('/schedule/getRejects', {
      params: { month: '2026-09', date: '2026-09-21' }, signal, timeout: 15000,
    })
  })
})
