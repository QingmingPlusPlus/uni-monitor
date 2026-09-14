import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDeviceAvailabilityDailyNet } from '../../../../api/deviceAvailability'
import { invalidateProductivityMhRecords, loadProductivityMhRows } from './productivityMhRecords'

vi.mock('../../../../api/deviceAvailability', () => ({ getDeviceAvailabilityDailyNet: vi.fn() }))

const month = '2026-07'
const cutoff = { dateKey: 20260702, shift: 'day' as const }
type Response = Awaited<ReturnType<typeof getDeviceAvailabilityDailyNet>>
function response(data: unknown, success = true): Response {
  return { data: { success, code: success ? '00000' : 'B0001', data } } as Response
}

describe('生产性设备净工时', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateProductivityMhRecords(month, 'department1')
    invalidateProductivityMhRecords(month, 'department4')
  })

  it('前处理1和前处理2按各自设备请求，不共用整个前处理的MH', async () => {
    vi.mocked(getDeviceAvailabilityDailyNet).mockImplementation(async params => response([
      { period: '2026-07-01', netHours: params.deviceCode === 'A' ? 2 : params.deviceCode === 'B' ? 3 : 10 },
    ]))
    const map = { pretreatment1: new Set(['A', 'B']), pretreatment2: new Set(['C']) }
    const rows = await loadProductivityMhRows(month, 'department1', ['pretreatment1', 'pretreatment2'], map, cutoff, {})
    expect(rows).toEqual([
      { processType: 'pretreatment1', day: 1, netHours: 5 },
      { processType: 'pretreatment2', day: 1, netHours: 10 },
    ])
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(3)
    expect(vi.mocked(getDeviceAvailabilityDailyNet).mock.calls.map(([params]) => params)).toEqual([
      { month, departmentId: '1', processType: 'preprocessing', deviceCode: 'A' },
      { month, departmentId: '1', processType: 'preprocessing', deviceCode: 'B' },
      { month, departmentId: '1', processType: 'preprocessing', deviceCode: 'C' },
    ])
    expect(await loadProductivityMhRows(month, 'department1', ['pretreatment2'], map, cutoff, {})).toEqual([rows[1]])
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(3)
  })

  it('任一设备缺日值或返回非法工时，则当天分母为空；有效零保留', async () => {
    vi.mocked(getDeviceAvailabilityDailyNet).mockImplementation(async params => response(params.deviceCode === 'A'
      ? [{ period: '2026-07-01', netHours: 0 }, { period: '2026-07-02', netHours: 4 }]
      : [{ period: '2026-07-01', netHours: 0 }]))
    const map = { vulcanization2: new Set(['A', 'B']) }
    const rows = await loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, cutoff, {})
    expect(rows).toEqual([
      { processType: 'vulcanization2', day: 1, netHours: 0 },
      { processType: 'vulcanization2', day: 2, netHours: null },
    ])
    for (const netHours of [null, undefined, -1, NaN, Infinity, '2']) {
      vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue(response([{ period: '2026-07-01', netHours }]))
      const invalid = await loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, cutoff, { forceRefresh: true })
      expect(invalid[0]?.netHours).toBeNull()
    }
  })

  it('只使用当前月有效日期，凌晨沿用生产日截止，不累计重复日记录', async () => {
    vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue(response([
      { period: '2026-06-30', netHours: 90 }, { period: '2026-07-32', netHours: 90 },
      { period: '2026-07-01', netHours: 2 }, { period: '2026-07-01', netHours: 2 },
      { period: '2026-07-02', netHours: 3 }, { period: '2026-08-01', netHours: 90 },
      { period: 'invalid', netHours: 90 }, null,
    ]))
    const map = { vulcanization2: new Set(['A']) }
    const rows = await loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, { dateKey: 20260701, shift: 'night' }, {})
    expect(rows).toEqual([{ processType: 'vulcanization2', day: 1, netHours: null }])
    expect(await loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, { dateKey: 20260630, shift: 'night' }, {})).toEqual([])
  })

  it('同一工序任一请求失败时不使用部分设备工时，其他工序仍可用且并发最多六个', async () => {
    let active = 0
    let peak = 0
    vi.mocked(getDeviceAvailabilityDailyNet).mockImplementation(async params => {
      active++
      peak = Math.max(peak, active)
      await Promise.resolve()
      active--
      if (params.processType === 'sulfur_addition') throw new Error('timeout')
      return response([{ period: '2026-07-01', netHours: 5 }])
    })
    const rows = await loadProductivityMhRows(month, 'department4', ['vulcanization2', 'posttreatment2'], {
      vulcanization2: new Set(Array.from({ length: 50 }, (_, i) => `V${i}`)),
      posttreatment2: new Set(['P']),
    }, cutoff, {})
    expect(rows).toEqual([{ processType: 'posttreatment2', day: 1, netHours: 5 }])
    expect(peak).toBeLessThanOrEqual(6)
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(7)
  })

  it('地图缺失或设备集合为空时，均不扩大到整个部门工序', async () => {
    vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue(response([{ period: '2026-07-01', netHours: 2 }]))
    expect(await loadProductivityMhRows(month, 'department1', ['pretreatment1'], {}, cutoff, {})).toEqual([])
    expect(await loadProductivityMhRows(month, 'department4', ['vulcanization2'], { vulcanization2: new Set() }, cutoff, {})).toEqual([])
    expect(getDeviceAvailabilityDailyNet).not.toHaveBeenCalled()
    expect(await loadProductivityMhRows(month, 'department4', ['vulcanization2'], {}, cutoff, {})).toEqual([])
    expect(getDeviceAvailabilityDailyNet).not.toHaveBeenCalled()
  })

  it('刷新期间旧失败请求不能删除新缓存', async () => {
    let finishOld!: (value: Response) => void
    vi.mocked(getDeviceAvailabilityDailyNet)
      .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockResolvedValue(response([{ period: '2026-07-01', netHours: 6 }]))
    const map = { vulcanization2: new Set(['A']) }
    const oldRequest = loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, cutoff, {})
    await Promise.resolve()
    const fresh = await loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, cutoff, { forceRefresh: true })
    finishOld(response([], false))
    await oldRequest
    expect(await loadProductivityMhRows(month, 'department4', ['vulcanization2'], map, cutoff, {})).toEqual(fresh)
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(2)
  })
})
