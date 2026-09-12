import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getSchedulePlanByMonth, getScheduleOutputByMonth, getScheduleRejectsByMonth } from '../../../../api/schedule'
import { loadProcessDeviceCodeMap } from './factoryMapConfigCache'
import { loadProductionPlanTrendCard } from './loadProductionActualTrendCard'
vi.mock('../../../../api/schedule', () => ({ getSchedulePlanByMonth: vi.fn(), getScheduleOutputByMonth: vi.fn(), getScheduleRejectsByMonth: vi.fn() }))
vi.mock('./factoryMapConfigCache', async original => ({ ...await original<typeof import('./factoryMapConfigCache')>(), loadProcessDeviceCodeMap: vi.fn() }))
const record = (number: number, extra = {}) => ({ date: '2026-07-01', banci: '早', dept: '4', process: '加硫', shebei: 'V1', zhifan: 'test', number, ...extra })
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 6, 2, 8))
  vi.stubGlobal('window', { sessionStorage: { getItem: () => '{}' } })
  vi.mocked(loadProcessDeviceCodeMap).mockResolvedValue({ vulcanization2: new Set(['V1']) })
  vi.mocked(getSchedulePlanByMonth).mockResolvedValue({ data: { success: true, data: [record(100)] } } as any)
  vi.mocked(getScheduleOutputByMonth).mockResolvedValue({ data: { success: true, data: [record(80)] } } as any)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })
it('八行、占位与五条图表系列；不良按范围和班次聚合且保留真实零', async () => {
  vi.mocked(getScheduleRejectsByMonth).mockResolvedValue({ data: { success: true, data: [record(3), record(0, { date: '2026-07-02' }), record(99, { shebei: 'outside' }), record(99, { date: '2026-07-02', banci: '夜' }), record(99, { date: '2026-06-01' })] } } as any)
  const card = (await loadProductionPlanTrendCard('department4', ['vulcanization2'], { forceRefresh: true }))!
  expect(card.tableRows.map(row => row.label)).toEqual(['计划生产数', '实绩生产数', '合格数', '不良数', '其他', '达成率', '合格率', '不良率'])
  expect(card.tableData.rejected.month).toBe(3)
  expect(card.modalTableData?.rejected.day2).toBe(0)
  expect(card.tableData.achievementRate.month).toBe(80)
  for (const key of ['qualified', 'other', 'qualifiedRate', 'defectRate']) {
    expect(Object.values(card.tableData[key]).every(value => value === null)).toBe(true)
    expect(Object.values(card.modalTableData![key]).every(value => value === null)).toBe(true)
  }
  expect(card.chartOptions.series?.map(series => series.name)).toEqual(['计划', '实绩', '合格数', '达成率', '合格率'])
  expect(card.chartData.series?.find(series => series.id === 'qualified')?.data?.every(value => value === null)).toBe(true)
  expect(card.modalChartData?.series).toHaveLength(5)
})
it.each([true, false])('不良空数据或业务失败不影响计划实绩（success=%s）', async success => {
  vi.mocked(getScheduleRejectsByMonth).mockResolvedValue({ data: { success, data: success ? [] : [record(99)] } } as any)
  const card = (await loadProductionPlanTrendCard('department4', ['vulcanization2'], { forceRefresh: true }))!
  expect(card.tableData.rejected.month).toBeNull()
  expect(card.tableData.actual.month).toBe(80)
})

