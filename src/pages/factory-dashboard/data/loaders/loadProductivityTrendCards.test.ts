import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleMonthlyRecord } from '../../../../api/schedule'
import { getScheduleOutputByMonth, getSchedulePlanByMonth } from '../../../../api/schedule'
import { defaultCssMapSelectionConfig as config } from '../../../../components/css-map/css3dMapSelection'
import { loadProcessDeviceCodeMap } from './factoryMapConfigCache'
import { aggregateRealProductivity, loadProductivityTrendCards } from './loadProductivityTrendCards'
import { invalidateProductionScheduleRecords } from './scheduleRecordCache'

vi.mock('../../../../api/schedule', () => ({
  getSchedulePlanByMonth: vi.fn(), getScheduleOutputByMonth: vi.fn(),
  getScheduleRukuPlanByMonth: vi.fn(), getScheduleRukuShijiByMonth: vi.fn(),
}))
vi.mock('./factoryMapConfigCache', async importOriginal => ({
  ...await importOriginal<typeof import('./factoryMapConfigCache')>(),
  loadProcessDeviceCodeMap: vi.fn(),
}))

const record = (overrides: Partial<ScheduleMonthlyRecord> = {}): ScheduleMonthlyRecord => ({
  date: '2026-07-01', dept: '4', process: '加硫', shebei: 'V1', banci: '早',
  number: 100, mh: 2, zhifan: 'fixture', ...overrides,
})
function respond(mock: typeof getSchedulePlanByMonth, data: ScheduleMonthlyRecord[], success = true) {
  vi.mocked(mock).mockResolvedValue({ data: { success, code: success ? '200' : 'B0001', data } } as Awaited<ReturnType<typeof mock>>)
}

describe('真实生产性推移表', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 2, 8))
    vi.stubGlobal('window', { sessionStorage: { getItem: () => null } })
    invalidateProductionScheduleRecords('2026-07')
    vi.mocked(loadProcessDeviceCodeMap).mockResolvedValue({ vulcanization2: new Set(['V1']), posttreatment2: new Set(['P1']) })
    respond(getSchedulePlanByMonth, [])
    respond(getScheduleOutputByMonth, [])
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('累加记录MH并用未舍入合计计算生产性；缺失MH不产生部分分母', () => {
    const result = aggregateRealProductivity([record({ number: 100, mh: 0.12 }), record({ number: 300, mh: 0.23 })], [record({ number: 350 })])
    expect(result.planMh).toBeCloseTo(0.35)
    expect(result.planProductivity).toBeCloseTo(400 / 0.35)
    expect(result.actualCount).toBe(350)
    expect(result.actualMh).toBeNull()
    expect(result.actualProductivity).toBeNull()
    for (const mh of [undefined, null, NaN, Infinity, -1]) {
      const missing = aggregateRealProductivity([record(), record({ mh })], [])
      expect(missing.planCount).toBe(200)
      expect(missing.planMh).toBeNull()
      expect(missing.planProductivity).toBeNull()
    }
    expect(aggregateRealProductivity([record({ number: 0, mh: 0 })], []).planMh).toBe(0)
    expect(aggregateRealProductivity([record({ mh: 0 })], []).planProductivity).toBeNull()
  })

  it('按部门设备归属和班次截止汇总，日计划含全天；后处理也用生产数量', async () => {
    respond(getSchedulePlanByMonth, [record(), record({ date: '2026-07-02', number: 300, mh: 3 }),
      record({ date: '2026-07-02', banci: '夜', number: 600, mh: 6 }),
      record({ date: '2026-07-03', number: 900 }), record({ date: '2026-06-01', number: 999 }),
      record({ dept: '3', number: 999 }), record({ shebei: 'outside', number: 999 }),
      record({ shebei: 'P1', process: '后处理', number: 500, mh: 5 })])
    respond(getScheduleOutputByMonth, [record({ number: 90 }), record({ date: '2026-07-02', number: 250 }),
      record({ date: '2026-07-02', banci: '夜', number: 700 }), record({ shebei: 'P1', process: '后处理', number: 480 })])
    const [card, post] = await loadProductivityTrendCards('department4', ['vulcanization2', 'posttreatment2'], config)
    expect(card.tableData.planCount.month).toBe(400)
    expect(card.tableData.planMh.month).toBe(5)
    expect(card.tableData.planProductivity.month).toBe(80)
    expect(card.tableData.actualCount.month).toBe(340)
    expect(card.tableData.planCount.day2).toBe(900)
    expect(card.tableData.planMh.day2).toBe(9)
    expect(card.tableData.actualCount.day2).toBe(250)
    expect(card.modalTableData?.planCount.day3).toBeNull()
    expect(post.tableData.planCount.month).toBe(500)
    expect(post.tableData.actualCount.month).toBe(480)
    for (const current of [card, post]) {
      expect(Object.values(current.tableData.actualMh).every(value => value === null)).toBe(true)
      expect(Object.values(current.modalTableData!.actualProductivity).every(value => value === null)).toBe(true)
      const row = current.tableRows.find(row => row.key === 'actualMh')!
      expect(row.formatter?.(null, { row, column: current.tableColumns[0]! })).toBe('-')
    }
    expect(card.chartData.series?.find(series => series.id === 'planCount')?.data?.[0]).toBe(0.4)
    expect(card.chartOptions.series?.map(series => [series.id, series.type, series.yAxisIndex ?? 0])).toEqual([
      ['planCount', 'bar', 0], ['actualCount', 'bar', 0], ['planProductivity', 'line', 1], ['actualProductivity', 'line', 1],
    ])
  })

  it('凌晨归前一生产日；本月第一日凌晨不纳入当天计划', async () => {
    vi.setSystemTime(new Date(2026, 6, 2, 5))
    respond(getSchedulePlanByMonth, [record({ banci: '夜' }), record({ date: '2026-07-02', number: 999 })])
    const [card] = await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(card.tableData.planCount.month).toBe(100)
    expect(card.modalTableData?.planCount.day2).toBeNull()
    vi.setSystemTime(new Date(2026, 6, 1, 5))
    const [firstDay] = await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(firstDay.tableData.planCount.month).toBeNull()
  })

  it('成功空数组、业务失败和网络失败不产生mock；计划与实绩独立可用', async () => {
    respond(getSchedulePlanByMonth, [record()])
    respond(getScheduleOutputByMonth, [record({ number: 999 })], false)
    const [partial] = await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(partial.tableData.planCount.month).toBe(100)
    expect(partial.tableData.actualCount.month).toBeNull()
    vi.mocked(getSchedulePlanByMonth).mockRejectedValue(new Error('offline'))
    respond(getScheduleOutputByMonth, [])
    const [empty] = await loadProductivityTrendCards('department4', ['vulcanization2'], config, { forceRefresh: true })
    expect(Object.values(empty.tableData).flatMap(Object.values).every(value => value === null)).toBe(true)
  })

  it('多工序共用月请求，手动刷新重新读取计划与实绩', async () => {
    respond(getSchedulePlanByMonth, [record()])
    await loadProductivityTrendCards('department4', ['vulcanization2', 'posttreatment2'])
    await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(getSchedulePlanByMonth).toHaveBeenCalledTimes(1)
    respond(getSchedulePlanByMonth, [record({ number: 300, mh: 3 })])
    const [updated] = await loadProductivityTrendCards('department4', ['vulcanization2', 'posttreatment2'], config, { forceRefresh: true })
    expect(getSchedulePlanByMonth).toHaveBeenCalledTimes(2)
    expect(getScheduleOutputByMonth).toHaveBeenCalledTimes(2)
    expect(updated.tableData.planCount.month).toBe(300)
    expect(updated.tableData.planMh.month).toBe(3)
  })
})
