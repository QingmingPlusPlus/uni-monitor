import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAttendanceDetailSituation,
  getAttendanceSituation,
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
  loadAttendanceCard,
  loadAttendanceTrendCard,
  loadInboundPlanTrendCard,
  loadPersonnelDetailCard,
  loadProductionActivityData,
  loadProductionPlanTrendCard,
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
          { section: 'vulcanization1', deviceCode: 'D5' },
          { section: 'vulcanization1', deviceCode: 'D6' },
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
          createRealtimeItem('D2', { actualStatus: 'normal' }),
          createRealtimeItem('D3', { actualStatus: 'pause_running', deviceParseType: 'CUT' }),
          createRealtimeItem('D4', { actualStatus: 'pause_not_running', deviceParseType: 'MATERIAL_WAIT' }),
          createRealtimeItem('D5', { actualStatus: 'pause_running', deviceParseType: 'TOOL_CHANGE' }),
          createRealtimeItem('D6', { actualStatus: 'pause_not_running', deviceParseType: 'CLEAN' }),
        ],
      },
    } as Awaited<ReturnType<typeof getDeviceRealtimeList>>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('按 css-map 结构化判定：切替/清扫计入稼动，计划停止不计入，异常单独计入异常列', async () => {
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
      totalCount: 6,
      runningCount: 4,
      abnormalCount: 1,
      plannedStopCount: 2,
    })
  })
})

describe('loadAttendanceCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 1, 8, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('班长归入间接，组长归入直接，首列显示间接和直接在籍加和', async () => {
    vi.mocked(getAttendanceSituation).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          {
            shiftType: 'day',
            shiftTypeName: '早班',
            positionId: 'leader-direct',
            positionName: '班长',
            schedulePersonCount: 2,
            actualAttendancePersonCount: 2,
            positionType: 'direct',
          },
          {
            shiftType: 'day',
            shiftTypeName: '早班',
            positionId: 'leader-indirect',
            positionName: '间接班长',
            schedulePersonCount: 1,
            actualAttendancePersonCount: 1,
            positionType: 'indirect',
          },
          {
            shiftType: 'day',
            shiftTypeName: '早班',
            positionId: 'indirect-other',
            positionName: '间接人员',
            schedulePersonCount: 4,
            actualAttendancePersonCount: 3,
            positionType: 'indirect',
          },
          {
            shiftType: 'day',
            shiftTypeName: '早班',
            positionId: 'group-leader',
            positionName: '组长',
            schedulePersonCount: 3,
            actualAttendancePersonCount: 3,
            positionType: 'direct',
          },
          {
            shiftType: 'day',
            shiftTypeName: '早班',
            positionId: 'regular',
            positionName: '正式工',
            schedulePersonCount: 10,
            actualAttendancePersonCount: 9,
            positionType: 'direct',
          },
          {
            shiftType: 'day',
            shiftTypeName: '早班',
            positionId: 'dispatched',
            positionName: '派遣工',
            schedulePersonCount: 2,
            actualAttendancePersonCount: 1,
            positionType: 'direct',
          },
        ],
      },
    } as Awaited<ReturnType<typeof getAttendanceSituation>>)

    const card = await loadAttendanceCard(
      'department2',
      ['vulcanization1'],
      defaultCssMapSelectionConfig,
      new Date(2026, 6, 1, 8, 0, 0),
    )

    expect(getAttendanceSituation).toHaveBeenCalledWith({
      date: '2026-07-01',
      department: '2',
      processType: 'sulfur_addition',
    })

    const row = card.groups[0]?.rows.find((row) => row.shift === 'day')
    expect(row).toMatchObject({
      indirectDirectRoster: 22,
      indirectRosterTotal: 7,
      indirectAttendanceTotal: 6,
      indirectLeaderRoster: 3,
      indirectLeaderAttendance: 3,
      directTeamLeader: 3,
      directRegular: 10,
      directDispatched: 2,
      directRosterTotal: 15,
      actualAttendance: 13,
      attendanceRate: 86.7,
    })
  })

  it('多工序族时部门全体合计行汇总所有明细，不返回 0', async () => {
    vi.mocked(getAttendanceSituation).mockImplementation((params) => {
      const processType = (params as { processType: string }).processType
      if (processType === 'sulfur_addition') {
        return Promise.resolve({
          data: {
            success: true,
            code: '200',
            message: 'ok',
            data: [
              {
                shiftType: 'day',
                shiftTypeName: '早班',
                positionId: 'regular',
                positionName: '正式工',
                schedulePersonCount: 10,
                actualAttendancePersonCount: 8,
                positionType: 'direct',
              },
              {
                shiftType: 'middle',
                shiftTypeName: '中班',
                positionId: 'regular',
                positionName: '正式工',
                schedulePersonCount: 20,
                actualAttendancePersonCount: 18,
                positionType: 'direct',
              },
            ],
          },
        } as Awaited<ReturnType<typeof getAttendanceSituation>>)
      }
      return Promise.resolve({
        data: {
          success: true,
          code: '200',
          message: 'ok',
          data: [
            {
              shiftType: 'day',
              shiftTypeName: '早班',
              positionId: 'regular',
              positionName: '正式工',
              schedulePersonCount: 5,
              actualAttendancePersonCount: 4,
              positionType: 'direct',
            },
            {
              shiftType: 'night',
              shiftTypeName: '晚班',
              positionId: 'regular',
              positionName: '正式工',
              schedulePersonCount: 15,
              actualAttendancePersonCount: 12,
              positionType: 'direct',
            },
          ],
        },
      } as Awaited<ReturnType<typeof getAttendanceSituation>>)
    })

    const card = await loadAttendanceCard(
      'department4',
      ['vulcanization2', 'posttreatment2'],
      defaultCssMapSelectionConfig,
      new Date(2026, 6, 1, 8, 0, 0),
    )

    const allGroup = card.groups.find((g) => g.label === '制造4课全体')
    expect(allGroup).toBeDefined()
    const totalRow = allGroup?.rows.find((row) => row.shift === 'total')
    expect(totalRow).toMatchObject({
      directRosterTotal: 50,
      actualAttendance: 42,
      directRegular: 50,
      attendanceRate: 84.0,
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

  it('强制刷新时绕过同月入库计划和实绩缓存重新请求接口', async () => {
    const firstCard = await loadInboundPlanTrendCard('department2', ['pretreatment1'], {
      forceRefresh: true,
    })

    if (firstCard === null) {
      throw new Error('expected first inbound trend card')
    }

    expect(firstCard.tableData.planInbound.day1).toBe(10)
    expect(firstCard.tableData.actualInbound.day1).toBe(4)

    vi.mocked(getScheduleRukuPlanByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-07-01', number: 30, zhifan: '', dept: '2', customer: 'A' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleRukuPlanByMonth>>)
    vi.mocked(getScheduleRukuShijiByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-07-01', banci: 'day', shebei: 'A', number: 27, zhifan: '', dept: '2', cusCode: '', custName: 'A' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleRukuShijiByMonth>>)

    const refreshedCard = await loadInboundPlanTrendCard('department2', ['pretreatment1'], {
      forceRefresh: true,
    })

    if (refreshedCard === null) {
      throw new Error('expected refreshed inbound trend card')
    }

    expect(getScheduleRukuPlanByMonth).toHaveBeenCalledTimes(2)
    expect(getScheduleRukuShijiByMonth).toHaveBeenCalledTimes(2)
    expect(refreshedCard.tableData.planInbound.day1).toBe(30)
    expect(refreshedCard.tableData.actualInbound.day1).toBe(27)
    expect(refreshedCard.tableData.achievementRate.day1).toBe(90)
  })
})

describe('loadProductionPlanTrendCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 1, 8, 0, 0))
    installSessionStorage({
      '2:sulfur_addition': [
        { segmentIndex: 1, startDay: 1, endDay: 5 },
        { segmentIndex: 2, startDay: 6, endDay: 12 },
      ],
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no device map in test')))

    vi.mocked(getSchedulePlanByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { workDate: '2026-07-01', shebei: 'D1', number: 100, process: '加硫', zhifan: '', banci: 'day', dept: '2' },
          { workDate: '2026-07-02', shebei: 'D2', number: 200, process: '加硫', zhifan: '', banci: 'day', dept: '2' },
          { workDate: '2026-07-01', shebei: 'OTHER', number: 999, process: '后处理', zhifan: '', banci: 'day', dept: '2' },
        ],
      },
    } as Awaited<ReturnType<typeof getSchedulePlanByMonth>>)
    vi.mocked(getScheduleOutputByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-07-01', shebei: 'D1', number: 80, process: '加硫', zhifan: '', banci: 'day', dept: '2' },
          { date: '2026-07-02', shebei: 'D2', number: 220, process: '加硫', zhifan: '', banci: 'day', dept: '2' },
          { date: '2026-07-01', shebei: 'OTHER', number: 999, process: '后处理', zhifan: '', banci: 'day', dept: '2' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleOutputByMonth>>)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('使用 getPlan 和 getOutput 生成计划生产数、实绩生产数和达成率', async () => {
    const card = await loadProductionPlanTrendCard('department2', ['vulcanization1'], {
      forceRefresh: true,
    })

    if (card === null) {
      throw new Error('expected production plan trend card')
    }

    expect(getSchedulePlanByMonth).toHaveBeenCalledWith('2026-07')
    expect(getScheduleOutputByMonth).toHaveBeenCalledWith('2026-07')
    expect(card.tableRows.map((row) => row.label)).toEqual([
      '计划生产数',
      '实绩生产数',
      '实绩-计划',
      '生产达成率',
    ])
    expect(card.tableData.plan.day1).toBe(100)
    expect(card.tableData.actual.day1).toBe(80)
    expect(card.tableData.gap.day1).toBe(-20)
    expect(card.tableData.achievementRate.day1).toBe(80)
    expect(card.tableData.plan.week1).toBe(300)
    expect(card.tableData.actual.week1).toBe(300)
    expect(card.tableData.achievementRate.week1).toBe(100)
    expect(card.chartData?.series?.map((series) => series.id)).toEqual([
      'plan',
      'actual',
      'achievementRate',
    ])
  })

  it('强制刷新时绕过同月生产计划和实绩缓存重新请求接口', async () => {
    const firstCard = await loadProductionPlanTrendCard('department2', ['vulcanization1'], {
      forceRefresh: true,
    })

    if (firstCard === null) {
      throw new Error('expected first production plan trend card')
    }

    expect(firstCard.tableData.plan.day1).toBe(100)
    expect(firstCard.tableData.actual.day1).toBe(80)

    vi.mocked(getSchedulePlanByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { workDate: '2026-07-01', shebei: 'D1', number: 300, process: '加硫', zhifan: '', banci: 'day', dept: '2' },
        ],
      },
    } as Awaited<ReturnType<typeof getSchedulePlanByMonth>>)
    vi.mocked(getScheduleOutputByMonth).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          { date: '2026-07-01', shebei: 'D1', number: 270, process: '加硫', zhifan: '', banci: 'day', dept: '2' },
        ],
      },
    } as Awaited<ReturnType<typeof getScheduleOutputByMonth>>)

    const refreshedCard = await loadProductionPlanTrendCard('department2', ['vulcanization1'], {
      forceRefresh: true,
    })

    if (refreshedCard === null) {
      throw new Error('expected refreshed production plan trend card')
    }

    expect(getSchedulePlanByMonth).toHaveBeenCalledTimes(2)
    expect(getScheduleOutputByMonth).toHaveBeenCalledTimes(2)
    expect(refreshedCard.tableData.plan.day1).toBe(300)
    expect(refreshedCard.tableData.actual.day1).toBe(270)
    expect(refreshedCard.tableData.achievementRate.day1).toBe(90)
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

  it('月周间接/直接在籍平均剔除该指标为 0 的天', async () => {
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
            indirectSchedulePersonCount: 0,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 8,
            directAttendanceRate: 80,
          },
          {
            statDate: '2026-07-03',
            indirectSchedulePersonCount: 0,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 8,
            directAttendanceRate: 80,
          },
          {
            statDate: '2026-07-08',
            indirectSchedulePersonCount: 0,
            directSchedulePersonCount: 10,
            directAttendancePersonCount: 8,
            directAttendanceRate: 80,
          },
        ],
      },
    } as Awaited<ReturnType<typeof getMonthlyAttendanceSituation>>)

    const card = await loadAttendanceTrendCard('department2', ['pretreatment1'])

    if (card === null) {
      throw new Error('expected attendance trend card')
    }

    // 间接在籍仅第 1 天为 2，月/周平均应取该指标不为 0 的天
    expect(card.tableData.indirectCount.month).toBe(2)
    expect(card.tableData.indirectCount.week1).toBe(2)
    expect(card.tableData.indirectCount.week2).toBeNull()
    // 直接在籍每天均为 10，平均仍为 10
    expect(card.tableData.directCount.month).toBe(10)
    expect(card.tableData.directCount.week1).toBe(10)
    // 日列保持当天原值（day8 在当前周内联列，day1 仅弹窗展示）
    expect(card.tableData.indirectCount.day8).toBe(0)
    expect(card.modalTableData?.indirectCount.day1).toBe(2)
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

  it('出勤情况和出勤状态原样显示接口字段', async () => {
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
            attendanceSituation: '公出（客户支援）',
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
    expect(card.rows[0]?.attendanceStatusLabel).toBe('公出（客户支援）')
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
    indirectRosterTotal: number,
    indirectAttendanceTotal: number | null,
  ): PersonnelAttendanceRow {
    return {
      id: `${shift}-row`,
      shift,
      shiftLabel: shift,
      indirectDirectRoster: indirectRosterTotal + directRosterTotal,
      indirectRosterTotal,
      indirectAttendanceTotal,
      indirectLeaderRoster: 0,
      indirectLeaderAttendance: indirectAttendanceTotal,
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

  it('早班时段将正常班(regular)并入早班窗口汇总', async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 8, 0, 0))

    const attendance: PersonnelAttendanceData = {
      title: '人员出勤情况',
      subtitle: '制造1课',
      refreshedAt: '',
      groups: [
        {
          id: 'posttreatment',
          label: '后处理',
          rows: [
            buildAttendanceRow('day', 5, 5, 0, 0),
            buildAttendanceRow('regular', 0, 0, 2, 2),
            buildAttendanceRow('total', 5, 5, 2, 2),
          ],
        },
      ],
    }

    const summary = await createFactorySummaryData({
      activity: buildStubActivity(),
      attendance,
      processTypes: [],
    })

    const indirect = findLine(summary.left, 'indirectAttendance')
    expect(indirect?.value).toBe('2/2')
    expect(indirect?.rate).toBe('100.0%')
  })

  it('中班时段不并入正常班(regular)行', async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 15, 0, 0))

    const attendance: PersonnelAttendanceData = {
      title: '人员出勤情况',
      subtitle: '制造1课',
      refreshedAt: '',
      groups: [
        {
          id: 'posttreatment',
          label: '后处理',
          rows: [
            buildAttendanceRow('day', 5, 5, 0, 0),
            buildAttendanceRow('regular', 0, 0, 2, 2),
            buildAttendanceRow('middle', 4, 4, 1, 1),
            buildAttendanceRow('total', 9, 9, 3, 3),
          ],
        },
      ],
    }

    const summary = await createFactorySummaryData({
      activity: buildStubActivity(),
      attendance,
      processTypes: [],
    })

    const indirect = findLine(summary.left, 'indirectAttendance')
    expect(indirect?.value).toBe('1/1')
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
