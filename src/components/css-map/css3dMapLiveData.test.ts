import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceRealtimeItem } from '../../api/deviceRealtime'
import { getDeviceRealtimeList } from '../../api/deviceRealtime'
import {
  getScheduleChangePoint,
  getScheduleDeviceLoadByMonth,
} from '../../api/schedule'
import { loadCssMapData } from './css3dMapLiveData'
import type { CssMapJsonDevice } from './css3dMapTypes'

vi.mock('../../api/deviceRealtime', () => ({
  getDeviceRealtimeList: vi.fn(),
}))

vi.mock('../../api/schedule', () => ({
  getScheduleChangePoint: vi.fn(),
  getScheduleDeviceLoadByMonth: vi.fn(),
}))

function createMapDevice(id: string, deviceCode: string): CssMapJsonDevice {
  return {
    id,
    name: id,
    section: null,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    deviceCode,
  }
}

function createRealtimeItem(
  deviceCode: string,
  actualStatus: string,
  deviceParseType: string | null = null,
): DeviceRealtimeItem {
  return {
    deviceId: deviceCode,
    deviceCode,
    deviceName: deviceCode,
    deviceType: null,
    deviceTypeName: null,
    factoryId: 'factory',
    departmentId: '2',
    departmentName: '制造2课',
    processType: 'preprocessing',
    processTypeName: '前处理',
    procedureName: '',
    scheduleMode: '',
    deviceStatus: '',
    deviceStatusName: '',
    actualStatus,
    actualStatusName: '',
    deviceParseType,
    deviceParseTypeName: null,
    onlinePersonList: [],
    productionTaskList: [],
  }
}

function stubFactoryMapConfig(devices: readonly CssMapJsonDevice[]): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      source: {
        imageWidth: 1000,
        imageHeight: 600,
        coordinateOrigin: 'top-left',
        unit: 'px',
      },
      sections: [],
      devices,
    }),
  })))
}

function stubEmptyRuntimeSideData(): void {
  vi.mocked(getScheduleDeviceLoadByMonth).mockResolvedValue({
    data: { success: true, code: '200', message: 'ok', data: [] },
  } as unknown as Awaited<ReturnType<typeof getScheduleDeviceLoadByMonth>>)
  vi.mocked(getScheduleChangePoint).mockResolvedValue({
    data: { success: true, code: '200', message: 'ok', data: [] },
  } as unknown as Awaited<ReturnType<typeof getScheduleChangePoint>>)
}

describe('loadCssMapData realtime status mapping', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('按 actualStatus 和 deviceParseType 映射 css-map 工况', async () => {
    const cases = [
      { id: 'normal', code: 'D-01', actualStatus: 'normal', deviceParseType: null, expected: 'plannedStop' },
      { id: 'running', code: 'D-02', actualStatus: 'running', deviceParseType: null, expected: 'production' },
      { id: 'cut', code: 'D-03', actualStatus: 'pause_running', deviceParseType: 'CUT', expected: 'changeover' },
      { id: 'clean', code: 'D-04', actualStatus: 'pause_not_running', deviceParseType: 'CLEAN', expected: 'cleaning' },
      { id: 'tool-change', code: 'D-05', actualStatus: 'pause_running', deviceParseType: 'TOOL_CHANGE', expected: 'plannedStop' },
      { id: 'device-tool-change', code: 'D-06', actualStatus: 'pause_not_running', deviceParseType: 'DEVICE_TOOL_CHANGE', expected: 'plannedStop' },
      { id: 'rest', code: 'D-07', actualStatus: 'pause_running', deviceParseType: 'REST', expected: 'plannedStop' },
      { id: 'device-rest', code: 'D-08', actualStatus: 'pause_not_running', deviceParseType: 'DEVICE_REST', expected: 'plannedStop' },
      { id: 'device-change', code: 'D-09', actualStatus: 'pause_running', deviceParseType: 'DEVICE_CHANGE', expected: 'abnormalStop' },
      { id: 'quality-check', code: 'D-10', actualStatus: 'pause_running', deviceParseType: 'QUALITY_CHECK', expected: 'abnormalStop' },
      { id: 'material-wait', code: 'D-11', actualStatus: 'pause_running', deviceParseType: 'MATERIAL_WAIT', expected: 'abnormalStop' },
      { id: 'startup', code: 'D-12', actualStatus: 'pause_running', deviceParseType: 'STARTUP', expected: 'abnormalStop' },
      { id: 'shutdown', code: 'D-13', actualStatus: 'pause_running', deviceParseType: 'SHUTDOWN', expected: 'abnormalStop' },
      { id: 'poor-initial-touch', code: 'D-14', actualStatus: 'pause_running', deviceParseType: 'POOR_INITIAL_TOUCH', expected: 'abnormalStop' },
      { id: 'clear-gun-head', code: 'D-15', actualStatus: 'pause_running', deviceParseType: 'CLEAR_GUN_HEAD', expected: 'abnormalStop' },
      { id: 'unknown-pause', code: 'D-16', actualStatus: 'pause_not_running', deviceParseType: null, expected: 'abnormalStop' },
    ] as const

    stubFactoryMapConfig(cases.map((item) => createMapDevice(item.id, item.code)))
    vi.mocked(getDeviceRealtimeList).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: cases.map((item) => createRealtimeItem(item.code, item.actualStatus, item.deviceParseType)),
      },
    } as Awaited<ReturnType<typeof getDeviceRealtimeList>>)
    stubEmptyRuntimeSideData()

    const data = await loadCssMapData()
    const statusByDeviceId = new Map(data.devices.map((device) => [device.id, device.runtime.status]))

    cases.forEach((item) => {
      expect(statusByDeviceId.get(item.id)).toBe(item.expected)
    })
  })

  it('汇总节点优先显示切替或清扫，而不是普通计划停止', async () => {
    stubFactoryMapConfig([
      {
        id: 'aggregate',
        name: 'aggregate',
        section: null,
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        deviceCodes: ['D-01', 'D-02'],
      },
    ])
    vi.mocked(getDeviceRealtimeList).mockResolvedValue({
      data: {
        success: true,
        code: '200',
        message: 'ok',
        data: [
          createRealtimeItem('D-01', 'normal'),
          createRealtimeItem('D-02', 'pause_running', 'CUT'),
        ],
      },
    } as Awaited<ReturnType<typeof getDeviceRealtimeList>>)
    stubEmptyRuntimeSideData()

    const data = await loadCssMapData()

    expect(data.devices[0]?.runtime.status).toBe('changeover')
  })
})
