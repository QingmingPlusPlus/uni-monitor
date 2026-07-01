import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAttendanceDetailSituation } from '../../../api/attendance'
import {
  getScheduleRukuPlanByMonth,
  getScheduleRukuShijiByMonth,
} from '../../../api/schedule'
import { defaultCssMapSelectionConfig } from '../../../components/css-map/css3dMapSelection'
import {
  loadInboundPlanTrendCard,
  loadPersonnelDetailCard,
} from './factoryDashboardLoader'

vi.mock('../../../api/attendance', () => ({
  getAttendanceDetailSituation: vi.fn(),
  getAttendanceSituation: vi.fn(),
  getMonthlyAttendanceSituation: vi.fn(),
}))

vi.mock('../../../api/schedule', () => ({
  getScheduleDeviceLoadByMonth: vi.fn(),
  getScheduleOutputByMonth: vi.fn(),
  getSchedulePlanByMonth: vi.fn(),
  getScheduleRukuPlanByMonth: vi.fn(),
  getScheduleRukuShijiByMonth: vi.fn(),
}))

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

function installSessionStorage(record: unknown): void {
  const sessionStorage = new MemoryStorage()
  sessionStorage.setItem('uni-monitor:month-segment:2026-07', JSON.stringify(record))
  Object.defineProperty(globalThis, 'window', {
    value: { sessionStorage },
    configurable: true,
  })
}

describe('loadInboundPlanTrendCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 1, 8, 0, 0))
    installSessionStorage({
      pretreatment1: [
        { segmentIndex: 1, startDay: 1, endDay: 5 },
        { segmentIndex: 2, startDay: 6, endDay: 12 },
      ],
    })

    vi.mocked(getScheduleRukuPlanByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-07-01', number: 10, zhifan: '', dept: '2', customer: 'A' },
          { date: '2026-07-02', number: 20, zhifan: '', dept: '2', customer: 'A' },
          { date: '2026-07-04', number: 40, zhifan: '', dept: '2', customer: 'A' },
          { date: '2026-07-05', number: 50, zhifan: '', dept: '2', customer: 'A' },
          { date: '2026-07-01', number: 999, zhifan: '', dept: '3', customer: 'B' },
          { date: '2026-07-02', number: 777, zhifan: '', customer: '未标识' },
          { date: '2026-07-03', number: 555, zhifan: '', dept: '0', customer: '未归属' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleRukuPlanByMonth>>)
    vi.mocked(getScheduleRukuShijiByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-07-01', banci: 'day', shebei: 'A', number: 4, zhifan: '', dept: '2', cusCode: '', custName: 'A' },
          { date: '2026-07-02', banci: 'day', shebei: 'A', number: 21, zhifan: '', dept: '2', cusCode: '', custName: 'A' },
          { date: '2026-07-01', banci: 'day', shebei: 'B', number: 999, zhifan: '', dept: '3', cusCode: '', custName: 'B' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleRukuShijiByMonth>>)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('右侧小表展示当前周工作日列并隐藏周六日，展开表保留全月日列', async () => {
    const card = await loadInboundPlanTrendCard('department2', ['pretreatment1'])

    if (card === null) {
      throw new Error('expected inbound trend card')
    }

    expect(getScheduleRukuPlanByMonth).toHaveBeenCalledWith('2026-07')
    expect(getScheduleRukuShijiByMonth).toHaveBeenCalledWith('2026-07')
    expect(card.tableColumns.map((column) => column.key)).toEqual([
      'month',
      'week1',
      'week2',
      'day1',
      'day2',
      'day3',
    ])
    expect(card.modalTableColumns?.map((column) => column.key)).toContain('day4')
    expect(card.modalTableColumns?.map((column) => column.key)).toContain('day5')
    expect(card.tableData.planInbound.day1).toBe(10)
    expect(card.tableData.planInbound.day2).toBe(20)
    expect(card.tableData.planInbound.day3).toBeNull()
    expect(card.tableData.actualInbound.day1).toBe(4)
    expect(card.tableData.actualInbound.day2).toBe(21)
    expect(card.tableData.gap.day1).toBe(-6)
    expect(card.tableData.achievementRate.day1).toBe(40)
    expect(card.tableData.planInbound.day4).toBeUndefined()
    expect(card.tableData.planInbound.day5).toBeUndefined()
    expect(card.modalTableData?.planInbound.day4).toBe(40)
    expect(card.modalTableData?.planInbound.day5).toBe(50)
  })
})

describe('loadPersonnelDetailCard', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('出勤状态原样显示 attendanceStatus 字段', async () => {
    vi.mocked(getAttendanceDetailSituation).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          {
            shiftName: '早班',
            account: '0501',
            realName: '测试人员',
            positionName: '正式工',
            workTypeName: '操作工',
            attendanceSituation: '出勤',
            attendanceStatus: '本岗-新人',
            ability: 'A',
            workHourList: [{ workHourType: '定时', workHour: '8h00min' }],
          },
        ],
      },
    } as Awaited<ReturnType<typeof getAttendanceDetailSituation>>)

    const card = await loadPersonnelDetailCard(
      'department2',
      ['vulcanization1'],
      defaultCssMapSelectionConfig,
      new Date(2026, 5, 29, 8, 0, 0),
    )

    expect(getAttendanceDetailSituation).toHaveBeenCalledWith({
      date: '2026-06-29',
      department: '2',
      processType: 'sulfur_addition',
    })
    expect(card.rows[0]?.attendanceStateLabel).toBe('本岗-新人')
  })
})
