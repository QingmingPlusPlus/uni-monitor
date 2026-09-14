import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReportAttendanceSource, getReportPlanSource, getReportOutputSource, getReportRejectsSource, getReportDeviceSource, type DailyReportQuery } from '../../api/dailyReport'
import { getDailyAttendance, getDailyProduction, getDailyQuality, getDailyLineLosses } from './reportApi'
import { validAttendance, validLines, validProduction, validQuality, validReportMeta } from './reportValidation'
import { absenceTotal, attendanceRate, metricValue, rankQuality } from './reportModel'

vi.mock('../../api/dailyReport', () => ({ getReportAttendanceSource: vi.fn(), getReportPlanSource: vi.fn(), getReportOutputSource: vi.fn(), getReportRejectsSource: vi.fn(), getReportDeviceSource: vi.fn() }))
const query: DailyReportQuery = { date: '2026-07-01', department: '4', processType: 'sulfur_addition' }
const row = (values = {}) => ({ date: query.date, dept: '4', process: '加硫', shebei: 'A', zhifan: 'TEST', banci: '早', number: 100, ...values })
const response = (data: unknown, success = true) => ({ data: { success, code: success ? '00000' : 'B0001', message: '', data } })
function stubSource(mock: typeof getReportPlanSource, data: unknown, success = true) {
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
    expect(production.rows[0]).toMatchObject({ plan: { value: 150 }, actual: { value: 80 }, qualified: { value: null }, flowing: { value: null }, defective: { value: null }, scrapped: { value: null } })
    expect(production.meta).toMatchObject({ timestampSource: 'retrieved', periodStart: null, periodEnd: null, status: 'partial' })
    expect(validReportMeta(production.meta, query)).toBe(true)
    expect(validProduction(production.rows)).toBe(true)
    expect(getReportPlanSource).toHaveBeenCalledTimes(1)
    expect(getReportOutputSource).toHaveBeenCalledTimes(1)
    expect(getReportRejectsSource).toHaveBeenCalledTimes(1)
    expect(getReportPlanSource).toHaveBeenCalledWith('2026-07', expect.any(AbortSignal))
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

  it('部分来源失败仍保留可用实绩；所有来源失败才让分区报错', async () => {
    stubSource(getReportPlanSource, [], false)
    vi.mocked(getReportRejectsSource).mockRejectedValue(new Error('timeout'))
    vi.mocked(getReportDeviceSource).mockRejectedValue(new Error('timeout'))
    const report = (await getDailyProduction(query)).data.data
    expect(report.rows[0]).toMatchObject({ plan: { value: null }, actual: { value: 80 } })
    expect(report.meta.notes.join('')).toContain('生产计划')
    expect((await getDailyLineLosses(query)).data.data.rows[0].actual.value).toBe(80)
    vi.mocked(getReportOutputSource).mockRejectedValue(new Error('timeout'))
    await expect(getDailyProduction(query)).rejects.toThrow()
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
