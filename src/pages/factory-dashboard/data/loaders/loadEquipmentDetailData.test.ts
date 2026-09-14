import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDeviceAvailabilityByDay, getDevicePauseRecords, type DevicePauseRecord } from '../../../../api/deviceAvailability'
import { getDeviceRealtimeList } from '../../../../api/deviceRealtime'
import { getScheduleDeviceLoadByMonth } from '../../../../api/schedule'
import { loadEquipmentDetailData } from './loadEquipmentDetailData'

vi.mock('../../../../api/deviceAvailability', () => ({
  getDeviceAvailabilityByDay: vi.fn(),
  getDevicePauseRecords: vi.fn(),
}))
vi.mock('../../../../api/deviceRealtime', () => ({ getDeviceRealtimeList: vi.fn() }))
vi.mock('../../../../api/schedule', () => ({ getScheduleDeviceLoadByMonth: vi.fn() }))

function stubRecords(pauses: DevicePauseRecord[], fuhe: number | string) {
  vi.mocked(getDeviceRealtimeList).mockResolvedValue({
    data: { success: true, code: '00000', message: 'ok', data: [] },
  } as unknown as Awaited<ReturnType<typeof getDeviceRealtimeList>>)
  vi.mocked(getDeviceAvailabilityByDay).mockResolvedValue({
    data: { success: true, code: '00000', message: 'ok', data: [] },
  } as unknown as Awaited<ReturnType<typeof getDeviceAvailabilityByDay>>)
  vi.mocked(getDevicePauseRecords).mockResolvedValue({
    data: { success: true, code: '00000', message: 'ok', data: pauses },
  } as unknown as Awaited<ReturnType<typeof getDevicePauseRecords>>)
  vi.mocked(getScheduleDeviceLoadByMonth).mockResolvedValue({
    data: { success: true, code: '200', message: 'ok', data: [{ devCode: 'TEST-01', devName: '测试设备', fuhe }] },
  } as unknown as Awaited<ReturnType<typeof getScheduleDeviceLoadByMonth>>)
}

describe('设备详情 Swagger 字段适配', () => {
  afterEach(() => vi.clearAllMocks())

  it('读取暂停名称、数字状态及分钟数，允许未恢复记录没有结束时间', async () => {
    stubRecords([
      { pauseTypeName: '测试暂停', startTime: '2026-09-14T08:00:00', endTime: '2026-09-14T08:20:00', durationMinutes: 20, operationStatus: 2 },
      { pauseTypeName: '测试暂停', startTime: '2026-09-14T09:00:00', endTime: null, durationMinutes: 10, operationStatus: 1 },
    ], '0.80217')

    const result = await loadEquipmentDetailData(null, 'TEST-01')

    expect(result.timeline).toEqual([
      { time: '08:00', title: '测试暂停', detail: '已恢复 · 08:00–08:20 · 20 分钟' },
      { time: '09:00', title: '测试暂停', detail: '暂停中 · 09:00–-- · 10 分钟' },
    ])
    expect(result.lossReasons).toEqual([{ label: '测试暂停', value: '30 分钟', tone: 'warning' }])
    expect(result.kpis.find((item) => item.label === '停止类型')).toMatchObject({ value: '测试暂停', note: '暂停中' })
    expect(result.kpis.find((item) => item.label === '平均负荷率')?.value).toBe('80.2%')
  })

  it.each(['', ' ', 'not-a-number', 'Infinity'])('无效负荷 %j 不转换为零或非有限百分比', async (fuhe) => {
    stubRecords([], fuhe)
    const result = await loadEquipmentDetailData(null, 'TEST-01')
    expect(result.kpis.find((item) => item.label === '平均负荷率')?.value).toBe('—')
  })
})
