import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReportAttendanceSource, getReportPlanSource, getReportOutputSource, getReportRejectsSource, getReportDeviceSource, type DailyReportQuery } from '../../api/dailyReport'
import { getDailyAttendance, getDailyProduction, getDailyQuality, getDailyLineLosses } from './reportApi'
import { validAttendance, validLines, validProduction, validQuality, validReportMeta } from './reportValidation'
import { absenceTotal, attendanceIssues, attendanceRate, formatMetric, formatReportedRatio, metricValue, percent, rankLines, rankQuality } from './reportModel'

vi.mock('../../api/dailyReport', () => ({ getReportAttendanceSource: vi.fn(), getReportPlanSource: vi.fn(), getReportOutputSource: vi.fn(), getReportRejectsSource: vi.fn(), getReportDeviceSource: vi.fn() }))
const query: DailyReportQuery = { date: '2026-07-01', department: '4', processType: 'sulfur_addition' }
const row = (values = {}) => ({ date: query.date, dept: '4', process: '加硫', shebei: 'A', zhifan: 'TEST', banci: '早', number: 100, ...values })
const response = (data: unknown, success = true) => ({ data: { success, code: success ? '00000' : 'B0001', message: '', data } })
function stubSource(mock: typeof getReportPlanSource | typeof getReportRejectsSource, data: unknown, success = true) {
  vi.mocked(mock).mockResolvedValue(response(data, success) as Awaited<ReturnType<typeof mock>>)
}

describe('日报真实接口适配', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubSource(getReportPlanSource, [row()])
    stubSource(getReportOutputSource, [row({ number: 80 })])
    stubSource(getReportRejectsSource, [])
    vi.mocked(getReportDeviceSource).mockResolvedValue(response([]) as Awaited<ReturnType<typeof getReportDeviceSource>>)
  })

  it('生产、品质、设备三区共享进行中的月请求，不受地图白名单限制，数量不伪造', async () => {
    stubSource(getReportPlanSource, [row(), row({ dept: '2', number: 999 }), row({ process: '后处理', number: 999 }), row({ date: '2026-07-02', number: 999 }), row({ shebei: 'MAP-OUTSIDE', number: 50 })])
    const [productionResponse, qualityResponse, deviceResponse] = await Promise.all([getDailyProduction(query), getDailyQuality(query), getDailyLineLosses(query)])
    const production = productionResponse.data.data
    expect(production.rows[0]).toMatchObject({ plan: { value: 150 }, actual: { value: 80 }, qualified: { value: 80 }, flowing: { value: 80 }, defective: { value: 0 }, scrapped: { value: 0 } })
    expect(production.meta).toMatchObject({ timestampSource: 'retrieved', periodStart: null, periodEnd: null, status: 'partial' })
    expect(validReportMeta(production.meta, query)).toBe(true)
    expect(validProduction(production.rows)).toBe(true)
    expect(getReportPlanSource).toHaveBeenCalledTimes(1)
    expect(getReportOutputSource).toHaveBeenCalledTimes(1)
    expect(getReportRejectsSource).toHaveBeenCalledTimes(1)
    expect(getReportDeviceSource).toHaveBeenCalledTimes(1)
    expect(getReportPlanSource).toHaveBeenCalledWith('2026-07', expect.any(AbortSignal))
    expect(getReportRejectsSource).toHaveBeenCalledWith({ month: '2026-07', date: query.date }, expect.any(AbortSignal))
    const quality = qualityResponse.data.data
    expect(quality.meta.qualityDimension).toBe('production_number')
    expect(quality.rows[0].dimension).toBe('production_number')
    expect(validQuality(quality.rows, query, quality.meta)).toBe(true)
    expect(rankQuality(quality.rows, query.processType, quality.meta.qualityDimension)).toEqual([])
    expect(deviceResponse.data.data.rows.map(item => item.id)).toEqual(['A', 'MAP-OUTSIDE'])
    await getDailyProduction(query)
    expect(getReportPlanSource).toHaveBeenCalledTimes(2)
  })

  it('合并真实细分工序名称，未知工序只提示且不把不完整合计用于排行', async () => {
    stubSource(getReportPlanSource, [row({ process: '前处理1', number: 10 }), row({ process: '前处理2', number: 20 }),
      row({ process: '后处理', number: 30 }), row({ process: '仕上检查', number: 40 }), row({ process: '出货检查包装', number: 50 })])
    stubSource(getReportOutputSource, [row({ process: '出货检查包装', number: 60 })])
    const pre = (await getDailyProduction({ ...query, processType: 'preprocessing' })).data.data
    const post = (await getDailyProduction({ ...query, processType: 'post_processing' })).data.data
    expect(pre.rows[0].plan).toMatchObject({ value: 30, status: 'complete' })
    expect(post.rows[0]).toMatchObject({ plan: { value: 120, status: 'complete' }, actual: { value: 60 } })
    stubSource(getReportPlanSource, [row(), row({ process: '未知工序' })])
    const partial = (await getDailyProduction(query)).data.data
    expect(partial.rows[0].plan).toMatchObject({ value: 100, status: 'partial' })
    expect(partial.meta.notes.join('')).toContain('未知工序')
  })

  it('已明确分类按不良统计，废弃数为不良加其他；缺少分类不猜测', async () => {
    stubSource(getReportRejectsSource, [row({ number: 2, type: '不良', dept: undefined, process: undefined }), row({ number: 3, type: '其它', dept: undefined, process: undefined })])
    const production = (await getDailyProduction(query)).data.data
    expect(production.rows[0]).toMatchObject({ defective: { value: 2 }, scrapped: { value: 5 } })
    const quality = (await getDailyQuality(query)).data.data
    expect(rankQuality(quality.rows, query.processType, quality.meta.qualityDimension)).toHaveLength(1)
    expect(quality.rows[0].reasons).toBeNull()
    stubSource(getReportRejectsSource, [row({ number: 5 })])
    expect((await getDailyProduction(query)).data.data.rows[0].defective.value).toBeNull()
  })

  it('不良设备归属冲突时排除，未知归属时已知部分不参与完整排名', async () => {
    stubSource(getReportPlanSource, [row(), row({ dept: '2' })])
    stubSource(getReportRejectsSource, [row({ dept: undefined, process: undefined, number: 9, type: '不良' })])
    const production = (await getDailyProduction(query)).data.data
    expect(production.rows[0].defective.value).toBeNull()
    expect(production.meta.notes.join('')).toContain('无法确认')
  })

  it('设备日报保留真实小时与原始比率，未明确的可运转时间不强行套公式', async () => {
    vi.mocked(getReportDeviceSource).mockResolvedValue(response([
      { deviceCode: 'A', deviceName: '测试设备', departmentId: '4', processType: 'sulfur_addition', day: query.date,
        totalRunHours: 10, productionHours: 8, obstructionHours: 2, availabilityRate: 0.8,
        obstructionItems: [{ pauseType: 'TEST', pauseTypeName: '测试原因', obstructionHours: 2, count: 3, ratio: 0.2 }] },
      { deviceCode: 'WRONG', departmentId: '2', processType: 'sulfur_addition', day: query.date },
    ]) as Awaited<ReturnType<typeof getReportDeviceSource>>)
    const report = (await getDailyLineLosses(query)).data.data
    expect(getReportDeviceSource).toHaveBeenCalledWith({ day: query.date, departmentId: '4', processType: 'sulfur_addition' }, expect.any(AbortSignal))
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({ totalRunSeconds: { value: 36000 }, productionSeconds: { value: 28800 }, lossSeconds: { value: 7200 },
      availableSeconds: { value: null }, plannedStopSeconds: { value: null }, reportedAvailabilityRate: { value: 0.8 },
      reasons: [{ count: { value: 3 }, durationSeconds: { value: 7200 }, reportedRatio: { value: 0.2 } }] })
    expect(validLines(report.rows)).toBe(true)
  })

  it('按截图公式计算数量与百分比，品质与生产保持一致', async () => {
    stubSource(getReportPlanSource, [row({ number: 141000 })])
    stubSource(getReportOutputSource, [row({ number: 138845 })])
    stubSource(getReportRejectsSource, [row({ number: 200, type: '不良' }), row({ number: 200, type: '其它' })])
    const production = (await getDailyProduction(query)).data.data.rows[0]
    expect(production).toMatchObject({ id: 'TEST', name: 'TEST', flowing: { value: 138845 },
      defective: { value: 200 }, scrapped: { value: 400 }, actual: { value: 139245 }, qualified: { value: 139045 } })
    expect(percent(production.actual, production.plan)).toBe('98.76%')
    expect(percent(production.qualified, production.actual)).toBe('99.86%')
    const lines = (await getDailyLineLosses(query)).data.data
    expect(lines.meta.lineDimension).toBe('line')
    expect(lines.rows[0].actual).toEqual(production.actual)
    const quality = (await getDailyQuality(query)).data.data.rows[0]
    expect(quality.actual).toEqual(production.actual)
    expect(quality.qualified).toEqual(production.qualified)
  })

  it('制番并集有序，相同制番跨设备班次合计，同设备的不同制番分行', async () => {
    stubSource(getReportPlanSource, [row({ zhifan: 'B', number: 20 }), row({ zhifan: 'A', number: 100 }),
      row({ zhifan: 'A', shebei: 'B', banci: '夜', number: 50 }), row({ zhifan: 'PLAN', number: 10 })])
    stubSource(getReportOutputSource, [row({ zhifan: 'B', number: 10 }), row({ zhifan: 'A', number: 70 }),
      row({ zhifan: 'A', shebei: 'B', banci: '夜', number: 30 }), row({ zhifan: 'OUTPUT', number: 5 })])
    stubSource(getReportRejectsSource, [row({ zhifan: 'A', type: '不良', number: 2 }),
      row({ zhifan: 'A', shebei: 'B', type: '其他分类', number: 3 }), row({ zhifan: 'REJECT', type: '不良', number: 4 })])
    const rows = (await getDailyProduction(query)).data.data.rows
    expect(rows.map(item => item.id)).toEqual(['A', 'B', 'OUTPUT', 'PLAN', 'REJECT'])
    expect(rows[0]).toMatchObject({ plan: { value: 150 }, flowing: { value: 100 }, actual: { value: 105 }, qualified: { value: 103 } })
    expect(rows[1]).toMatchObject({ defective: { value: 0 }, scrapped: { value: 0 }, actual: { value: 10 } })
    expect(rows[3].actual.value).toBeNull()
    expect(rows[4].scrapped.value).toBe(4)
  })

  it.each([
    [[], 0, 0, 80, 80],
    [[row({ date: '2026-07-02', type: '不良', number: 20 })], 0, 0, 80, 80],
    [[row({ type: '不良', number: 2 })], 2, 2, 82, 80],
    [[row({ type: '其它', number: 3 })], 0, 3, 83, 83],
    [[row({ type: '', number: 5 })], null, 5, 85, null],
    [[row({ type: '不良', number: '' })], null, null, null, 80],
  ])('生产不良分类及空数据：%j', async (rejects, defective, scrapped, actual, qualified) => {
    stubSource(getReportRejectsSource, rejects)
    const value = (await getDailyProduction(query)).data.data.rows[0]
    expect([value.defective.value, value.scrapped.value, value.actual.value, value.qualified.value])
      .toEqual([defective, scrapped, actual, qualified])
    const quality = (await getDailyQuality(query)).data.data.rows[0]
    expect([quality.defective.value, quality.actual.value, quality.qualified.value]).toEqual([defective, actual, qualified])
  })

  it('制番或设备归属缺失不能生成完整小计及排行', async () => {
    stubSource(getReportOutputSource, [row({ number: 80 }), row({ number: 20, zhifan: '' })])
    const production = (await getDailyProduction(query)).data.data
    expect(production.rows).toHaveLength(1)
    expect(production.rows[0].actual).toMatchObject({ value: 80, status: 'partial' })
    expect(production.meta.notes.join('')).toContain('缺少制番')
    stubSource(getReportRejectsSource, [row({ shebei: '', type: '不良', number: 5 })])
    const lines = (await getDailyLineLosses(query)).data.data
    expect(lines.meta.notes.join('')).toContain('缺少设备编码')
    expect(rankLines(lines.rows)).toEqual([])
  })

  it('产线实绩包含废弃，跨过90%退出排行，并列按设备编码且不补位', async () => {
    stubSource(getReportPlanSource, ['A', 'B', 'C', 'D', 'E'].map(shebei => row({ shebei, number: shebei === 'E' ? 0 : 100 })))
    stubSource(getReportOutputSource, ['A', 'B', 'C', 'D', 'E'].map(shebei => row({ shebei, number: 80 })))
    stubSource(getReportRejectsSource, [row({ type: '不良', number: 10 })])
    const report = (await getDailyLineLosses(query)).data.data
    expect(report.rows.find(item => item.id === 'A')?.actual.value).toBe(90)
    expect(rankLines(report.rows).map(item => item.id)).toEqual(['B', 'C', 'D'])
    stubSource(getReportPlanSource, [row()])
    stubSource(getReportOutputSource, [row({ number: 80 })])
    stubSource(getReportRejectsSource, [])
    expect(rankLines((await getDailyLineLosses(query)).data.data.rows).map(item => item.id)).toEqual(['A'])
  })

  it.each([0, 0.845, 84.5, 0.09223456])('服务端比例 %s 保留原值，不换算不附百分号', value => {
    expect(formatReportedRatio({ value, status: 'complete' })).toBe(String(value))
    expect(formatReportedRatio({ value: null, status: 'unavailable' })).toBe('—')
  })

  it('品质按含废弃实绩计算不良率排行，并列按制番，零不良不排名', async () => {
    const quantities = [{ zhifan: 'A', number: 10 }, { zhifan: 'B', number: 50 }, { zhifan: 'C', number: 50 }, { zhifan: 'D', number: 20 }, { zhifan: 'ZERO', number: 100 }]
    stubSource(getReportOutputSource, quantities.map(item => row(item)))
    stubSource(getReportRejectsSource, [row({ zhifan: 'A', type: '不良', number: 10 }), row({ zhifan: 'A', type: '其它', number: 180 }),
      ...['B', 'C'].map(zhifan => row({ zhifan, type: '不良', number: 10 })), row({ zhifan: 'D', type: '不良', number: 20 })])
    const report = (await getDailyQuality(query)).data.data
    expect(rankQuality(report.rows, query.processType, report.meta.qualityDimension).map(item => item.id)).toEqual(['D', 'B', 'C'])
    expect(percent(report.rows[0].defective, report.rows[0].actual)).toBe('5.00%')
    const zero = report.rows.find(item => item.id === 'ZERO')!
    expect(percent(zero.defective, zero.actual)).toBe('0.00%')
    expect(report.rows.filter(item => item.id !== 'ZERO').every(item => item.reasons === null)).toBe(true)
    expect(zero.reasons).toEqual([])
  })

  it('现象按yuanyin跨设备班次合计，排除其它及范围外记录，比例使用主体实绩', async () => {
    stubSource(getReportOutputSource, [row({ number: 80 })])
    stubSource(getReportRejectsSource, [
      row({ type: '不良', yuanyin: ' 划伤 ', number: '3' }),
      row({ type: '不良', yuanyin: '划伤', number: '2.0', shebei: 'B', banci: '夜' }),
      row({ type: '不良', yuanyin: '缺料', number: 4 }),
      row({ type: '不良', yuanyin: '变形', number: 1 }),
      row({ type: '其它', yuanyin: '划伤', number: 10 }),
      row({ type: '不良', yuanyin: '范围外', number: 999, date: '2026-07-02' }),
      row({ type: '不良', yuanyin: '范围外', number: 999, dept: '2' }),
      row({ type: '不良', yuanyin: '范围外', number: 999, process: '后处理' }),
    ])
    const [quality, production] = await Promise.all([getDailyQuality(query), getDailyProduction(query)])
    const value = quality.data.data.rows[0]
    expect(value).toMatchObject({ actual: { value: 100 }, qualified: { value: 90 }, defective: { value: 10 } })
    expect(value.reasons).toEqual([
      { code: '划伤', name: '划伤', count: { value: 5, status: 'complete' } },
      { code: '缺料', name: '缺料', count: { value: 4, status: 'complete' } },
      { code: '变形', name: '变形', count: { value: 1, status: 'complete' } },
    ])
    expect(percent(value.reasons![0].count, value.actual)).toBe('5.00%')
    expect(production.data.data.rows[0].scrapped.value).toBe(20)
    expect(validQuality(quality.data.data.rows, query, quality.data.data.meta)).toBe(true)
  })

  it('缺失现象不伪造名称或摊分数量，已知现象保留部分小计', async () => {
    stubSource(getReportRejectsSource, [row({ type: '不良', yuanyin: '划伤', number: 3 }),
      row({ type: '不良', yuanyin: ' ', number: 2 })])
    const value = (await getDailyQuality(query)).data.data.rows[0]
    expect(value.defective).toMatchObject({ value: 5, status: 'complete' })
    expect(value.reasons).toEqual([{ code: '划伤', name: '划伤', count: {
      value: 3, status: 'partial', note: expect.any(String),
    } }])
    expect(percent(value.reasons![0].count, value.actual)).toBe('—')
    expect(value.reasonNote).toContain('现象')
  })

  it('现象非法数量不转零，空源无现象，失败不生成现象', async () => {
    stubSource(getReportRejectsSource, [row({ type: '不良', yuanyin: '划伤', number: '' }),
      row({ type: '不良', yuanyin: '划伤', number: 2 }), row({ type: '不良', yuanyin: '缺料', number: null })])
    const value = (await getDailyQuality(query)).data.data.rows[0]
    expect(value.reasons![0].count).toMatchObject({ value: 2, status: 'partial' })
    expect(value.reasons![1].count.value).toBeNull()
    expect(rankQuality([value], query.processType, 'production_number')).toEqual([])
    stubSource(getReportRejectsSource, [])
    expect((await getDailyQuality(query)).data.data.rows[0].reasons).toEqual([])
    stubSource(getReportRejectsSource, [], false)
    expect((await getDailyQuality(query)).data.data.rows[0].reasons).toBeNull()
  })

  it('同月不同日期只共享月计划实绩，不共享日不良，取消一天不影响另一天', async () => {
    const next = { ...query, date: '2026-07-02' }
    const completions = new Map<string, () => void>()
    const signals = new Map<string, AbortSignal>()
    vi.mocked(getReportRejectsSource).mockImplementation((params, signal) => new Promise(resolve => {
      signals.set(params.date!, signal!)
      completions.set(params.date!, () => resolve(response([row({ date: params.date, type: '不良', yuanyin: '划伤', number: 2 })]) as Awaited<ReturnType<typeof getReportRejectsSource>>))
    }))
    const controller = new AbortController()
    const first = getDailyProduction(query, controller.signal)
    const canceled = expect(first).rejects.toMatchObject({ name: 'CanceledError' })
    const second = getDailyQuality(next)
    await Promise.resolve()
    expect(getReportPlanSource).toHaveBeenCalledTimes(1)
    expect(getReportOutputSource).toHaveBeenCalledTimes(1)
    expect(getReportRejectsSource).toHaveBeenCalledTimes(2)
    controller.abort()
    expect(signals.get(query.date)!.aborted).toBe(true)
    expect(signals.get(next.date)!.aborted).toBe(false)
    completions.get(query.date)!()
    completions.get(next.date)!()
    await canceled
    expect((await second).data.data.rows[0].reasons![0].count.value).toBe(2)
  })

  it('品质关联范围内的产线名称，名称来源异常不影响数量', async () => {
    stubSource(getReportOutputSource, [row({ number: 40 }), row({ number: 40, shebei: 'B' })])
    const device = { deviceCode: 'A', deviceName: '产线A', day: query.date, departmentId: query.department, processType: query.processType }
    stubSource(getReportDeviceSource as unknown as typeof getReportPlanSource, [device, { ...device, deviceCode: 'B', departmentId: '2', deviceName: '其他部门产线' }])
    const value = (await getDailyQuality(query)).data.data.rows[0]
    expect(value.lines).toEqual([{ id: 'A', name: '产线A' }, { id: 'B', name: 'B' }])
    expect(value.actual.value).toBe(80)
    stubSource(getReportDeviceSource as unknown as typeof getReportPlanSource, [device, device])
    expect((await getDailyQuality(query)).data.data.rows[0].lines[0].name).toBe('A')
    vi.mocked(getReportDeviceSource).mockRejectedValue(new Error('offline'))
    const fallback = (await getDailyQuality(query)).data.data
    expect(fallback.rows[0]).toMatchObject({ actual: { value: 80 }, qualified: { value: 80 }, defective: { value: 0 } })
    expect(fallback.rows[0].lines.map(item => item.name)).toEqual(['A', 'B'])
    expect(fallback.meta.notes.join('')).toContain('产线名称来源不可用')
  })

  it('品质来源失败不能变成零，只有名称可用时仍显示分区失败', async () => {
    stubSource(getReportRejectsSource, [], false)
    const partial = (await getDailyQuality(query)).data.data
    expect(partial.rows[0].actual.value).toBeNull()
    expect(partial.rows[0].qualified.value).toBeNull()
    expect(partial.rows[0].defective.value).toBeNull()
    expect(rankQuality(partial.rows, query.processType, partial.meta.qualityDimension)).toEqual([])
    stubSource(getReportOutputSource, [], false)
    await expect(getDailyQuality(query)).rejects.toThrow('品质数据源均不可用')
  })

  it('次日早班与班长按接口契约映射，缺少班次状态和时间时不造时间或推算缺勤', async () => {
    vi.mocked(getReportAttendanceSource).mockResolvedValue(response({ monitorNames: ['测试班长'], rows: [
      { statDate: query.date, reportDate: '2026-07-02', shiftType: 'night', shiftName: '夜班', onRollCount: 10, actualAttendanceCount: 8, attendanceRate: 80, absenceCount: 2,
        annualLeaveCount: 1, nursingLeaveCount: 0, sickLeaveCount: 1, personalLeaveCount: 0, otherLeaveCount: 0, absenteeismCount: 0 },
      { statDate: '2026-07-02', reportDate: '2026-07-02', shiftType: 'day', shiftName: '早班', onRollCount: 12, actualAttendanceCount: 9, attendanceRate: 75, absenceCount: null },
    ] }) as Awaited<ReturnType<typeof getReportAttendanceSource>>)
    const report = (await getDailyAttendance(query)).data.data
    expect(getReportAttendanceSource).toHaveBeenCalledWith({ department: '4', processType: 'sulfur_addition', dataDate: query.date, reportDate: '2026-07-02' }, undefined)
    expect(report.monitorNames).toEqual(['测试班长'])
    expect(report.rows.map(item => item.leaders)).toEqual([null, null])
    expect(report.rows[1]).toMatchObject({ isEarlyShift: true, status: 'reported', startAt: null, endAt: null })
    expect(validAttendance(report.rows, query)).toBe(true)
    expect(attendanceRate(report.rows[0])).toBe('80.0%')
    expect(metricValue(absenceTotal(report.rows[1]))).toBeNull()
  })

  it('不良来源失败保留流动数，依赖它的实绩缺失；所有来源失败才让分区报错', async () => {
    stubSource(getReportPlanSource, [], false)
    vi.mocked(getReportRejectsSource).mockRejectedValue(new Error('timeout'))
    vi.mocked(getReportDeviceSource).mockRejectedValue(new Error('timeout'))
    const report = (await getDailyProduction(query)).data.data
    expect(report.rows[0]).toMatchObject({ plan: { value: null }, flowing: { value: 80 }, actual: { value: null }, qualified: { value: null } })
    expect(report.meta.notes.join('')).toContain('生产计划')
    expect((await getDailyLineLosses(query)).data.data.rows[0].actual.value).toBeNull()
    vi.mocked(getReportOutputSource).mockRejectedValue(new Error('timeout'))
    await expect(getDailyProduction(query)).rejects.toThrow()
  })

  it('按 Swagger 接受十进制数量字符串，空值与非法值不变成零，部分数值保留但不排名', async () => {
    stubSource(getReportPlanSource, [row({ number: '100' }), row({ number: ' 20.0 ' })])
    stubSource(getReportOutputSource, [row({ number: '80' }), row({ number: '' }), row({ number: null }), row({ number: '0x10' }), row({ number: '1.5' })])
    const report = (await getDailyProduction(query)).data.data
    expect(report.rows[0].plan).toMatchObject({ value: 120, status: 'complete' })
    expect(report.rows[0].actual).toMatchObject({ value: 80, status: 'partial' })
    expect(percent(report.rows[0].actual, report.rows[0].plan)).toBe('—')
    expect(rankLines((await getDailyLineLosses(query)).data.data.rows)).toEqual([])
    expect(report.meta.notes.join('')).toContain('部分数量缺失或无效')
    stubSource(getReportOutputSource, [row({ number: '9007199254740993' })])
    expect((await getDailyProduction(query)).data.data.rows[0].actual.value).toBeNull()
  })

  it('单条格式异常不拖垮整个月来源，日期不明也不会生成完整合计', async () => {
    stubSource(getReportPlanSource, [row(), null])
    stubSource(getReportOutputSource, [row({ number: 80 }), row({ date: undefined })])
    const report = (await getDailyProduction(query)).data.data
    expect(report.rows[0].plan).toMatchObject({ value: 100, status: 'partial' })
    expect(report.rows[0].actual).toMatchObject({ value: 80, status: 'partial' })
    expect(report.meta.notes.join('')).toContain('记录格式异常')
    expect(report.meta.notes.join('')).toContain('日期缺失或无效')
    stubSource(getReportPlanSource, [null])
    expect((await getDailyProduction(query)).data.data.rows[0].plan.value).toBeNull()
  })

  it('不良分类不全及缺制番时保留已知数量，避免错误的品质排行', async () => {
    stubSource(getReportRejectsSource, [row({ number: 2, type: '不良' }), row({ number: 3, type: '未知' })])
    const production = (await getDailyProduction(query)).data.data.rows[0]
    expect(production.defective).toMatchObject({ value: 2, status: 'complete' })
    expect(production.scrapped).toMatchObject({ value: 5, status: 'complete' })
    expect(production.qualified.value).toBe(83)
    expect((await getDailyQuality(query)).data.data.rows[0].defective.status).toBe('complete')
    stubSource(getReportRejectsSource, [row({ number: 2, type: '不良' })])
    stubSource(getReportOutputSource, [row({ number: 80 }), row({ number: 20, zhifan: '' })])
    const quality = (await getDailyQuality(query)).data.data
    expect(quality.rows[0].actual).toMatchObject({ value: 82, status: 'partial' })
    expect(rankQuality(quality.rows, query.processType, quality.meta.qualityDimension)).toEqual([])
    expect(quality.meta.notes.join('')).toContain('缺少制番')
  })

  it('出勤小数分类不会丢失或四舍五入，名单缺失不影响有效班次', async () => {
    stubSource(getReportAttendanceSource as unknown as typeof getReportPlanSource, { monitorNames: null, rows: [
      { statDate: query.date, reportDate: '2026-07-02', shiftType: 'three_early', shiftName: '早班', onRollCount: 40, actualAttendanceCount: 37,
        attendanceRate: 92.5, absenceCount: 3, annualLeaveCount: 1, nursingLeaveCount: 0, sickLeaveCount: 1, personalLeaveCount: 0, otherLeaveCount: 1.5, absenteeismCount: 0 },
      { statDate: '2026-06-30', reportDate: '2026-07-02', shiftType: 'three_night', shiftName: '夜班' },
    ] })
    const report = (await getDailyAttendance(query)).data.data
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0].absence.other).toMatchObject({ value: 1.5, status: 'complete' })
    expect(formatMetric(report.rows[0].absence.other, false, 2)).toBe('1.5')
    expect(attendanceIssues(report.rows[0])).toContain('缺勤分类合计与缺勤总数不一致，请核对')
    expect(validAttendance(report.rows, query)).toBe(true)
    expect(report.monitorNames).toBeUndefined()
    expect(report.meta.notes.join('')).toContain('班长名单未提供')
    expect(report.meta.notes.join('')).toContain('部分出勤记录')
  })

  it('空月份和设备全零明确提示，重复设备时长不被重复统计', async () => {
    stubSource(getReportOutputSource, [])
    const production = (await getDailyProduction(query)).data.data
    expect(production.meta.notes.join('')).toContain('2026-07 月生产实绩接口未返回记录')
    expect(production.rows[0].actual.value).toBeNull()
    const device = { deviceCode: 'A', day: query.date, departmentId: '4', processType: 'sulfur_addition', totalRunHours: 0, productionHours: 0, obstructionHours: 0, obstructionItems: [] }
    vi.mocked(getReportDeviceSource).mockResolvedValue(response([device]) as Awaited<ReturnType<typeof getReportDeviceSource>>)
    const zeros = (await getDailyLineLosses(query)).data.data
    expect(zeros.rows[0].totalRunSeconds?.value).toBe(0)
    expect(zeros.meta.notes.join('')).toContain('全部返回 0')
    vi.mocked(getReportDeviceSource).mockResolvedValue(response([device, device]) as Awaited<ReturnType<typeof getReportDeviceSource>>)
    const duplicates = (await getDailyLineLosses(query)).data.data
    expect(duplicates.rows[0].totalRunSeconds?.value).toBeNull()
    expect(duplicates.meta.notes.join('')).toContain('重复设备')
  })

  it('单区取消不影响共享来源的另一分区，全部取消才中断上游', async () => {
    let finish!: (value: Awaited<ReturnType<typeof getReportPlanSource>>) => void
    let upstream!: AbortSignal
    vi.mocked(getReportPlanSource).mockImplementation((_month, signal) => {
      upstream = signal!
      return new Promise(resolve => { finish = resolve })
    })
    const first = new AbortController()
    const second = new AbortController()
    const one = getDailyProduction(query, first.signal)
    const oneFailed = expect(one).rejects.toMatchObject({ name: 'CanceledError' })
    const two = getDailyQuality(query, second.signal)
    await Promise.resolve()
    first.abort()
    expect(upstream.aborted).toBe(false)
    finish(response([row()]) as Awaited<ReturnType<typeof getReportPlanSource>>)
    await oneFailed
    expect((await two).data.data.rows[0].actual.value).toBe(80)
    const third = new AbortController()
    const three = getDailyProduction(query, third.signal)
    const threeFailed = expect(three).rejects.toMatchObject({ name: 'CanceledError' })
    await Promise.resolve()
    third.abort()
    expect(upstream.aborted).toBe(true)
    finish(response([]) as Awaited<ReturnType<typeof getReportPlanSource>>)
    await threeFailed
  })
})
