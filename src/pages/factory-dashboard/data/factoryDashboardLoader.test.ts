import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAttendanceDetailSituation,
  getMonthlyAttendanceSituation,
} from '../../../api/attendance'
import { getDeviceRealtimeList } from '../../../api/deviceRealtime'
import type { DeviceRealtimeItem } from '../../../api/deviceRealtime'
import {
  getScheduleOutputByMonth,
  getSchedulePlanByMonth,
  getScheduleRukuPlanByMonth,
  getScheduleRukuShijiByMonth,
} from '../../../api/schedule'
import { defaultCssMapSelectionConfig } from '../../../components/css-map/css3dMapSelection'
import {
  createFactorySummaryData,
  loadAttendanceTrendCard,
  loadInboundPlanTrendCard,
  loadPersonnelDetailCard,
  loadProductionActivityData,
} from './factoryDashboardLoader'
import type {
  PersonnelAttendanceData,
  PersonnelAttendanceRow,
} from './factoryDashboardTypes'

vi.mock('../../../api/attendance', () => ({
  getAttendanceDetailSituation: vi.fn(),
  getAttendanceSituation: vi.fn(),
  getMonthlyAttendanceSituation: vi.fn(),
}))

vi.mock('../../../api/schedule', () => ({
  getScheduleOutputByMonth: vi.fn(),
  getSchedulePlanByMonth: vi.fn(),
  getScheduleRukuPlanByMonth: vi.fn(),
  getScheduleRukuShijiByMonth: vi.fn(),
}))

vi.mock('../../../api/deviceRealtime', () => ({
  getDeviceRealtimeList: vi.fn(),
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

function createRealtimeItem(
  deviceCode: string,
  overrides: Partial<DeviceRealtimeItem> = {},
): DeviceRealtimeItem {
  return {
    deviceId: deviceCode,
    deviceCode,
    deviceName: deviceCode,
    deviceType: null,
    deviceTypeName: null,
    factoryId: '1',
    departmentId: '2',
    departmentName: '制造2课',
    processType: 'sulfur_addition',
    processTypeName: '加硫',
    procedureName: '',
    scheduleMode: '',
    deviceStatus: '',
    deviceStatusName: '',
    actualStatus: '',
    actualStatusName: '',
    deviceParseType: null,
    deviceParseTypeName: null,
    onlinePersonList: [],
    productionTaskList: [],
    ...overrides,
  }
}

describe('loadProductionActivityData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        devices: [
          { section: 'vulcanization1', deviceCode: 'D1' },
          { section: 'vulcanization1', deviceCode: 'D2' },
          { section: 'vulcanization1', deviceCode: 'D3' },
          { section: 'vulcanization1', deviceCode: 'D4' },
        ],
      }),
    }))
    vi.mocked(getDeviceRealtimeList).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          createRealtimeItem('D1', { actualStatus: 'running' }),
          createRealtimeItem('D2', { actualStatusName: '设备异常' }),
          createRealtimeItem('D3', { actualStatusName: '计划停止' }),
          createRealtimeItem('D4'),
        ],
      },
    } as Awaited<ReturnType<typeof getDeviceRealtimeList>>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('除计划停止外都计入稼动台数，异常仍单独计入异常列', async () => {
    const card = await loadProductionActivityData(
      'department2',
      ['vulcanization1'],
      defaultCssMapSelectionConfig,
    )

    expect(getDeviceRealtimeList).toHaveBeenCalledWith({
      departmentId: '2',
      processType: 'sulfur_addition',
    })
    expect(card.rows[0]).toMatchObject({
      totalCount: 4,
      runningCount: 3,
      abnormalCount: 1,
      plannedStopCount: 1,
    })
  })
})

describe('loadInboundPlanTrendCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 1, 8, 0, 0))
    installSessionStorage({
      '2:preprocessing': [
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
    expect(card.chartData?.xAxisData).toEqual(['1W', '2W', '1', '2', '3'])
    expect(card.modalTableData?.planInbound.day4).toBe(40)
    expect(card.modalTableData?.planInbound.day5).toBe(50)
  })
})

describe('loadAttendanceTrendCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 10, 8, 0, 0))
    installSessionStorage({
      '2:preprocessing': [
        { segmentIndex: 1, startDay: 1, endDay: 7 },
        { segmentIndex: 2, startDay: 8, endDay: 14 },
      ],
    })
    vi.mocked(getMonthlyAttendanceSituation).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          {
            statDate: '2026-07-01',
            indirectSchedulePersonCount: 2,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 8,
            directAttendanceRate: 80,
          },
          {
            statDate: '2026-07-02',
            indirectSchedulePersonCount: 2,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 0,
            directAttendanceRate: 0,
          },
          {
            statDate: '2026-07-03',
            indirectSchedulePersonCount: 2,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 6,
            directAttendanceRate: 60,
          },
          {
            statDate: '2026-07-08',
            indirectSchedulePersonCount: 2,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 0,
            directAttendanceRate: 0,
          },
        ],
      },
    } as Awaited<ReturnType<typeof getMonthlyAttendanceSituation>>)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('月周直接出勤平均和出勤率剔除直接出勤为 0 的天', async () => {
    const card = await loadAttendanceTrendCard('department2', ['pretreatment1'])

    if (card === null) {
      throw new Error('expected attendance trend card')
    }

    expect(getMonthlyAttendanceSituation).toHaveBeenCalledWith({
      month: '2026-07',
      department: '2',
      processType: 'preprocessing',
    })
    expect(card.tableData.directCount.month).toBe(10)
    expect(card.tableData.directAttendance.month).toBe(7)
    expect(card.tableData.directRate.month).toBe(70)
    expect(card.tableData.directAttendance.week1).toBe(7)
    expect(card.tableData.directRate.week1).toBe(70)
    expect(card.tableData.directAttendance.week2).toBeNull()
    expect(card.tableData.directRate.week2).toBeNull()
    expect(card.tableData.directAttendance.day8).toBe(0)
    expect(card.tableData.directRate.day8).toBe(0)
  })
})

describe('loadPersonnelDetailCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 29, 8, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
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

describe('createFactorySummaryData', () => {
  const EMPTY_SUMMARY_LINES = { value: '-', rate: '-' }

  function buildStubActivity() {
    return { title: '生产线稼动情况', rows: [] }
  }

  function buildStubAttendance() {
    return { title: '', subtitle: '', refreshedAt: '', groups: [] }
  }

  function buildAttendanceRow(
    shift: PersonnelAttendanceRow['shift'],
    directRosterTotal: number,
    actualAttendance: number,
    indirectDirectRoster: number,
    indirectLeaderAttendance: number | null,
  ): PersonnelAttendanceRow {
    return {
      id: `${shift}-row`,
      shift,
      shiftLabel: shift,
      indirectDirectRoster,
      indirectLeaderRoster: 0,
      indirectLeaderAttendance,
      directTeamLeader: 0,
      directRegular: directRosterTotal,
      directDispatched: 0,
      directTemporary: 0,
      directStandby: 0,
      directRosterTotal,
      actualAttendance,
      attendanceRate: null,
    }
  }

  function buildShiftAttendance(): PersonnelAttendanceData {
    return {
      title: '人员出勤情况',
      subtitle: '制造1课',
      refreshedAt: '',
      groups: [
        {
          id: 'pretreatment',
          label: '前处理',
          rows: [
            buildAttendanceRow('day', 10, 8, 2, 1),
            buildAttendanceRow('middle', 20, 18, 3, 2),
            buildAttendanceRow('night', 30, 24, 4, 3),
            buildAttendanceRow('total', 60, 50, 9, 6),
          ],
        },
        {
          id: 'department-all',
          label: '制造1课全体',
          rows: [
            buildAttendanceRow('middle', 999, 900, 999, 900),
          ],
        },
      ],
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 1, 8, 0, 0))

    vi.mocked(getScheduleRukuPlanByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-08-01', number: 100, dept: 9, customer: 'A' },
          { date: '2026-08-02', number: 200, dept: 0, customer: 'B' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleRukuPlanByMonth>>)
    vi.mocked(getScheduleRukuShijiByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-08-01', shebei: 'A', number: 150, dept: 9, custName: 'A' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleRukuShijiByMonth>>)
    vi.mocked(getSchedulePlanByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-08-01', shebei: 'X', number: 1000, process: '前处理', dept: 9, zhifan: '', banci: 'day' },
        ],
      },
    } as Awaited<ReturnType<typeof getSchedulePlanByMonth>>)
    vi.mocked(getScheduleOutputByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-08-01', shebei: 'X', number: 800, process: '前处理', dept: 9, zhifan: '', banci: 'day' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleOutputByMonth>>)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in test')))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function findLine(lines: readonly { readonly id: string; readonly value: string; readonly rate: string }[], id: string) {
    return lines.find((line) => line.id === id)
  }

  it('入库实绩/生产实际取当月接口全量合计，不按当前部门过滤', async () => {
    const summary = await createFactorySummaryData({
      activity: buildStubActivity(),
      attendance: buildStubAttendance(),
      processTypes: [],
    })

    const inbound = findLine(summary.right, 'inbound')
    const production = findLine(summary.right, 'production')

    expect(summary.right.map((line) => line.id)).toEqual(['inbound', 'production'])
    expect(inbound?.value).toBe('150/300')
    expect(inbound?.rate).toBe('50.0%')
    expect(production?.value).toBe('800/1,000')
    expect(production?.rate).toBe('80.0%')
  })

  it('直接/间接只汇总当前时间对应班次，且不重复计入部门全体行', async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 15, 0, 0))

    const summary = await createFactorySummaryData({
      activity: buildStubActivity(),
      attendance: buildShiftAttendance(),
      processTypes: [],
    })

    const direct = findLine(summary.left, 'directAttendance')
    const indirect = findLine(summary.left, 'indirectAttendance')

    expect(direct?.value).toBe('18/20')
    expect(direct?.rate).toBe('90.0%')
    expect(indirect?.value).toBe('2/3')
    expect(indirect?.rate).toBe('66.7%')
  })

  it('接口当月无数据时仍显示占位符', async () => {
    vi.setSystemTime(new Date(2026, 8, 1, 8, 0, 0))
    vi.mocked(getScheduleRukuPlanByMonth).mockResolvedValue({
      data: { success: true, code: '200', message: 'ok', data: [] },
    } as unknown as Awaited<ReturnType<typeof getScheduleRukuPlanByMonth>>)
    vi.mocked(getScheduleRukuShijiByMonth).mockResolvedValue({
      data: { success: true, code: '200', message: 'ok', data: [] },
    } as unknown as Awaited<ReturnType<typeof getScheduleRukuShijiByMonth>>)

    const summary = await createFactorySummaryData({
      activity: buildStubActivity(),
      attendance: buildStubAttendance(),
      processTypes: [],
    })

    const inbound = findLine(summary.right, 'inbound')
    expect(inbound?.value).toBe(EMPTY_SUMMARY_LINES.value)
    expect(inbound?.rate).toBe(EMPTY_SUMMARY_LINES.rate)
  })
})
