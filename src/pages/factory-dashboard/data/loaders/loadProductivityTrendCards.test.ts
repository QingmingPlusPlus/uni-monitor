import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleMonthlyRecord } from '../../../../api/schedule'
import { getScheduleOutputByMonth, getSchedulePlanByMonth } from '../../../../api/schedule'
import { defaultCssMapSelectionConfig as config } from '../../../../components/css-map/css3dMapSelection'
import { loadProcessDeviceCodeMap } from './factoryMapConfigCache'
import { aggregateRealProductivity, loadProductivityTrendCards } from './loadProductivityTrendCards'
import { invalidateProductionScheduleRecords } from './scheduleRecordCache'
import { getDeviceAvailabilityDailyNet } from '../../../../api/deviceAvailability'
import { invalidateProductivityMhRecords } from './productivityMhRecords'

vi.mock('../../../../api/deviceAvailability', () => ({ getDeviceAvailabilityDailyNet: vi.fn() }))

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
    invalidateProductivityMhRecords('2026-07', 'department4')
    vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue({
      data: { success: true, code: '00000', data: [] },
    } as unknown as Awaited<ReturnType<typeof getDeviceAvailabilityDailyNet>>)
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

  it('实绩生产性采用数量合计除以未舍入的净工时合计，区分零值和缺失', () => {
    const result = aggregateRealProductivity([], [record({ number: 100 }), record({ number: 300 })], [0.12, 0.23])
    expect(result.actualMh).toBeCloseTo(0.35)
    expect(result.actualProductivity).toBeCloseTo(400 / 0.35)
    expect(aggregateRealProductivity([], [record({ number: 0 })], [2]).actualProductivity).toBe(0)
    expect(aggregateRealProductivity([], [record()], [0])).toMatchObject({ actualMh: 0, actualProductivity: null })
    expect(aggregateRealProductivity([], [], [2])).toMatchObject({ actualMh: 2, actualCount: null, actualProductivity: null })
    for (const invalid of [undefined, null, NaN, Infinity, -1]) {
      expect(aggregateRealProductivity([], [record()], [2, invalid])).toMatchObject({ actualMh: null, actualProductivity: null })
    }
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
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(2)
    respond(getSchedulePlanByMonth, [record({ number: 300, mh: 3 })])
    const [updated] = await loadProductivityTrendCards('department4', ['vulcanization2', 'posttreatment2'], config, { forceRefresh: true })
    expect(getSchedulePlanByMonth).toHaveBeenCalledTimes(2)
    expect(getScheduleOutputByMonth).toHaveBeenCalledTimes(2)
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(4)
    expect(updated.tableData.planCount.month).toBe(300)
    expect(updated.tableData.planMh.month).toBe(3)
  })

  it('部门卡片分别汇总设备净工时，并同步日、周、月和展开图表', async () => {
    respond(getScheduleOutputByMonth, [record({ number: 100 }), record({ date: '2026-07-02', number: 300 }),
      record({ shebei: 'P1', process: '后处理', number: 480 })])
    vi.mocked(getDeviceAvailabilityDailyNet).mockImplementation(async params => ({
      data: { success: true, code: '00000', data: params.deviceCode === 'V1'
        ? [{ period: '2026-07-01', netHours: 0.12 }, { period: '2026-07-02', netHours: 0.23 }, { period: '2026-07-03', netHours: 99 }]
        : [{ period: '2026-07-01', netHours: 4 }] },
    } as Awaited<ReturnType<typeof getDeviceAvailabilityDailyNet>>))
    const [card, post] = await loadProductivityTrendCards('department4', ['vulcanization2', 'posttreatment2'])
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledWith({ month: '2026-07', departmentId: '4', processType: 'sulfur_addition', deviceCode: 'V1' })
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledWith({ month: '2026-07', departmentId: '4', processType: 'post_processing', deviceCode: 'P1' })
    expect(card.tableData.actualMh.month).toBeCloseTo(0.35)
    expect(card.tableData.actualMh.week1).toBeCloseTo(0.35)
    expect(card.tableData.actualMh.day2).toBe(0.23)
    expect(card.tableData.actualProductivity.month).toBeCloseTo(400 / 0.35)
    expect(card.modalTableData?.actualMh.day3).toBeNull()
    expect(card.modalTableData?.actualProductivity.day2).toBeCloseTo(300 / 0.23)
    expect(card.chartData.series?.find(series => series.id === 'actualProductivity')?.data?.[0]).toBeCloseTo(400 / 0.35)
    expect(post.tableData.actualMh.month).toBe(4)
    expect(post.tableData.actualProductivity.month).toBe(120)
    const [processCard] = await loadProductivityTrendCards('department4', ['posttreatment2'])
    expect(processCard.tableData.actualMh).toEqual(post.tableData.actualMh)
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(2)
  })

  it('有产出日期缺少MH时，不使用部分日期分母；其他日期仍能展示', async () => {
    respond(getScheduleOutputByMonth, [record(), record({ date: '2026-07-02' })])
    vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue({
      data: { success: true, code: '00000', data: [{ period: '2026-07-01', netHours: 2 }] },
    } as Awaited<ReturnType<typeof getDeviceAvailabilityDailyNet>>)
    const [card] = await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(card.tableData.actualCount.month).toBe(200)
    expect(card.tableData.actualMh.month).toBeNull()
    expect(card.tableData.actualProductivity.month).toBeNull()
    expect(card.tableData.actualProductivity.day1).toBe(50)
    expect(card.tableData.actualProductivity.day2).toBeNull()
  })

  it('MH业务失败不吞掉生产数量，下次加载可恢复且刷新重取MH', async () => {
    respond(getSchedulePlanByMonth, [record()])
    respond(getScheduleOutputByMonth, [record({ number: 80 })])
    vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue({
      data: { success: false, code: 'B0001', data: [{ period: '2026-07-01', netHours: 999 }] },
    } as Awaited<ReturnType<typeof getDeviceAvailabilityDailyNet>>)
    const [failed] = await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(failed.tableData.actualMh.month).toBeNull()
    expect(failed.tableData.actualCount.month).toBe(80)
    expect(failed.tableData.planMh.month).toBe(2)
    vi.mocked(getDeviceAvailabilityDailyNet).mockResolvedValue({
      data: { success: true, code: '00000', data: [{ period: '2026-07-01', netHours: 4 }] },
    } as Awaited<ReturnType<typeof getDeviceAvailabilityDailyNet>>)
    const [recovered] = await loadProductivityTrendCards('department4', ['vulcanization2'])
    expect(recovered.tableData.actualProductivity.month).toBe(20)
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(2)
    vi.mocked(getDeviceAvailabilityDailyNet).mockRejectedValue(new Error('timeout'))
    const [refreshed] = await loadProductivityTrendCards('department4', ['vulcanization2'], config, { forceRefresh: true })
    expect(getDeviceAvailabilityDailyNet).toHaveBeenCalledTimes(3)
    expect(refreshed.tableData.actualMh.month).toBeNull()
    expect(refreshed.tableData.actualCount.month).toBe(80)
  })
})
