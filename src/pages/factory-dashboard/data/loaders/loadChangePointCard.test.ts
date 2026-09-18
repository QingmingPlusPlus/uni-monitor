import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getScheduleChangePoint } from '../../../../api/schedule'
import { getProcessSegments } from '../../../../utils/monthSegment'
import { aggregateChangePoints, filterChangePoints, createEmptyChangePointData, loadChangePointCard, resolveChangePointWeek } from './loadChangePointCard'
vi.mock('../../../../api/schedule', () => ({ getScheduleChangePoint: vi.fn() }))
vi.mock('../../../../utils/monthSegment', async importOriginal => ({
  ...await importOriginal<typeof import('../../../../utils/monthSegment')>(), getProcessSegments: vi.fn(),
}))
const now = new Date(2026, 8, 16)
const record = { pid: 'a', date: '2026-09-01', type: '人' }
const response = (data: unknown[], success = true) => ({ data: { success, data } }) as Awaited<ReturnType<typeof getScheduleChangePoint>>
beforeEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals() })

describe('变化点统计', () => {
  it('按范围+序号去重，包含非设备记录，周/月累计独立，饼图使用全部返回记录', () => {
    const data = aggregateChangePoints([
      { scope: '1:前处理1', all: [record, record,
        { ...record, pid: 'b', date: '2026-09-16T09:00:00' },
        { ...record, pid: 'c', date: '2026-08-01', type: '机' },
        { ...record, pid: 'd', date: '2026-09-20', type: '机' },
      ] },
      { scope: '1:前处理2', all: [record] },
    ], now)
    expect(data.rows[0].total).toBe(3)
    expect(data.weekRows[0].total).toBe(1)
    expect(data.rows[1].total).toBe(0)
    expect(data.rows[1].allTotal).toBe(2)
    expect(data.rows[0].allTotal).toBe(3)
    expect(data.weekRows[1].allTotal).toBe(2)
    expect(data.weekDays).toEqual([14, 15, 16, 17, 18, 19, 20])
    expect(data.rows[0].days.slice(0, 2)).toEqual([2, 0])
    expect(data.rows[0].days[16]).toBeNull()
  })
  it('没有模具记录按零件处理，有 type=模具 的记录时正常计数', () => {
    const empty = aggregateChangePoints([{ scope: '1', all: [] }], now)
    expect(empty.rows[5].total).toBe(0)
    expect(empty.rows[5].allTotal).toBe(0)
    expect(empty.rows[5].days[0]).toBe(0)
    const data = aggregateChangePoints([{ scope: '1', all: [{ ...record, type: '模具', date: '2026-09-16' }] }], now)
    expect(data.rows[5].allTotal).toBe(1)
    expect(data.weekRows[5].total).toBe(1)
  })
  it('优先配置周，缺失、空配置、非法或未覆盖当天时回退自然周', () => {
    expect(resolveChangePointWeek(now, [{ segmentIndex: 3, startDay: 15, endDay: 21 }])).toEqual([15, 16, 17, 18, 19, 20, 21])
    for (const segments of [null, [], [{ segmentIndex: 1, startDay: 1, endDay: 7 }], [{ segmentIndex: 3, startDay: 0, endDay: 40 }]]) {
      expect(resolveChangePointWeek(now, segments)).toEqual([14, 15, 16, 17, 18, 19, 20])
    }
    expect(createEmptyChangePointData(new Date(2024, 1, 28)).days).toHaveLength(29)
    expect(resolveChangePointWeek(new Date(2024, 1, 28), null)).toEqual([26, 27, 28, 29])
  })
  it('部门不同工序配置周取日期并集，但每个工序仅计入自身本周记录', () => {
    const data = aggregateChangePoints([
      { scope: '4:加硫', weekDays: [14, 15, 16, 17, 18, 19, 20], all: [{ ...record, date: '2026-09-14' }] },
      { scope: '4:后处理', weekDays: [15, 16, 17, 18, 19, 20, 21], all: [{ ...record, date: '2026-09-14' }, { ...record, pid: 'b', date: '2026-09-15' }] },
    ], now)
    expect(data.weekDays).toEqual([14, 15, 16, 17, 18, 19, 20, 21])
    expect(data.weekRows[0].days.slice(0, 2)).toEqual([1, 1])
    expect(data.weekRows[0].total).toBe(2)
    expect(data.rows[0].total).toBe(3)
  })
  it('拒绝缺失唯一键、未知类别、非法日期和冲突序号', () => {
    for (const invalid of [{ ...record, pid: undefined }, { ...record, type: '未知' }, { ...record, date: '2026-09-31' }]) {
      expect(() => aggregateChangePoints([{ scope: '1', all: [invalid] }], now)).toThrow()
    }
    expect(() => aggregateChangePoints([{ scope: '1', all: [record, { ...record, date: '2026-08-01' }] }], now)).toThrow('冲突')
  })
  it('每工序查询全部及已关闭记录，配置查找使用接口科室+工序枚举', async () => {
    vi.stubGlobal('window', {})
    vi.mocked(getProcessSegments).mockReturnValue([{ segmentIndex: 3, startDay: 15, endDay: 21 }])
    vi.mocked(getScheduleChangePoint).mockResolvedValue(response([record]))
    const data = await loadChangePointCard('department1', ['pretreatment1', 'pretreatment2'], now)
    expect(getScheduleChangePoint).toHaveBeenCalledTimes(4)
    for (const process of ['前处理1', '前处理2']) expect(getScheduleChangePoint).toHaveBeenCalledWith({ dept: '1', process, progress: '' })
    expect(getProcessSegments).toHaveBeenCalledWith('1', 'preprocessing')
    expect(data.weekDays).toEqual([15, 16, 17, 18, 19, 20, 21])
    expect(data.rows[0].total).toBe(2)
  })
  it('任一工序失败不展示不完整合计，刷新重新请求', async () => {
    vi.mocked(getScheduleChangePoint).mockImplementation(async params => response([], params?.process !== '后处理'))
    const data = await loadChangePointCard('department4', ['vulcanization2', 'posttreatment2'], now)
    expect(data.status).toBe('error')
    expect(data.rows.every(row => row.total === null && row.allTotal === null)).toBe(true)
    await loadChangePointCard('department4', ['vulcanization2', 'posttreatment2'], now)
    expect(getScheduleChangePoint).toHaveBeenCalledTimes(8)
  })
})


describe('变化点明细与筛选', () => {
  it('跨工序同序号独立匹配状态，保留历史记录、文本及缺失字段', () => {
    const data = aggregateChangePoints([
      { scope: '1:前处理1', all: [{ ...record, banci: '早班', endDate: '2026-09-18', implMethod: '1.培训\n2.巡检' }], closed: [record] },
      { scope: '1:前处理2', all: [{ ...record, date: '2026-08-12' }], closed: [] },
    ], now)
    expect(data.records).toHaveLength(2)
    expect(data.records[0]).toMatchObject({ shift: '早', state: '已关闭', implMethod: '1.培训\n2.巡检' })
    expect(data.records[1]).toMatchObject({ shift: '', state: '进行中', changeDate: '2026-08-12' })
    expect(data.records[0].endDate).toBe('2026-09-18')
    expect(data.records[1].endDate).toBeUndefined()
  })
  it('日期两端包含、支持单边范围，班次与状态组合筛选和重置', () => {
    const data = aggregateChangePoints([{ scope: '1', all: [
      { ...record, banci: '早' },
      { ...record, pid: 'b', date: '2026-09-02', banci: '夜班' },
      { ...record, pid: 'c', date: '2026-09-03', banci: '早班' },
    ], closed: [record] }], now)
    const filters = { startDate: '', endDate: '', shift: '', state: '' }
    expect(filterChangePoints(data.records, filters)).toHaveLength(3)
    expect(filterChangePoints(data.records, { ...filters, startDate: '2026-09-02' })).toHaveLength(2)
    expect(filterChangePoints(data.records, { ...filters, endDate: '2026-09-02' })).toHaveLength(2)
    expect(filterChangePoints(data.records, { startDate: '2026-09-01', endDate: '2026-09-01', shift: '早', state: '已关闭' })).toHaveLength(1)
    expect(filterChangePoints(data.records, { ...filters, shift: '晚', state: '进行中' }).map(row => row.pid)).toEqual(['b'])
    expect(filterChangePoints(data.records, { ...filters, startDate: '2026-09-03', endDate: '2026-09-01' })).toEqual([])
  })
  it('已关闭查询失败时不将全部记录误报为进行中', async () => {
    vi.mocked(getScheduleChangePoint).mockImplementation(async params => response([record], params?.progress !== '1'))
    const data = await loadChangePointCard('department1', ['pretreatment1'], now)
    expect(data.status).toBe('error')
    expect(data.records).toEqual([])
  })
})
