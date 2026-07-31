import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceRealtimeItem } from '../../api/deviceRealtime'
import { getDeviceRealtimeList } from '../../api/deviceRealtime'
import {
  getScheduleChangePoint,
  getScheduleDeviceLoadByMonth,
} from '../../api/schedule'
import { loadCssMapData } from './css3dMapLiveData'
import { installCssMapMockSwitch } from './css3dMapMockRuntime'
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

function stubRealtimeList(items: readonly DeviceRealtimeItem[]): void {
  vi.mocked(getDeviceRealtimeList).mockResolvedValue({
    data: { success: true, code: '200', message: 'ok', data: items },
  } as Awaited<ReturnType<typeof getDeviceRealtimeList>>)
}

function stubEmptyRuntimeSideData(): void {
  vi.mocked(getScheduleDeviceLoadByMonth).mockResolvedValue({
    data: { success: true, code: '200', message: 'ok', data: [] },
  } as unknown as Awaited<ReturnType<typeof getScheduleDeviceLoadByMonth>>)
  vi.mocked(getScheduleChangePoint).mockResolvedValue({
    data: { success: true, code: '200', message: 'ok', data: [] },
  } as unknown as Awaited<ReturnType<typeof getScheduleChangePoint>>)
}

function stubBrowserWindow(): Window {
  const win = {
    sessionStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as Window

  vi.stubGlobal('window', win)
  return win
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
    stubRealtimeList(cases.map((item) => createRealtimeItem(item.code, item.actualStatus, item.deviceParseType)))
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
    stubRealtimeList([
      createRealtimeItem('D-01', 'normal'),
      createRealtimeItem('D-02', 'pause_running', 'CUT'),
    ])
    stubEmptyRuntimeSideData()

    const data = await loadCssMapData()

    expect(data.devices[0]?.runtime.status).toBe('changeover')
  })

  it('隐藏设备组，并按子设备的局部位置和实际尺寸显示所有子设备', async () => {
    stubFactoryMapConfig([
      {
        id: 'device-group',
        name: 'device-group',
        section: 'vulcanization1',
        x: 10,
        y: 20,
        width: 120,
        height: 80,
        children: [
          {
            id: 'child-1',
            name: 'child-1',
            deviceCode: 'D-01',
            x: 2,
            y: 5,
            width: 40,
            height: 30,
            contentLayout: 'right-l-shape',
            polygon: [
              { x: 0, y: 0 },
              { x: 40, y: 0 },
              { x: 20, y: 30 },
            ],
          },
          { id: 'child-2', name: 'child-2', deviceCode: 'D-02', x: 51, y: 5, width: 47, height: 30 },
          { id: 'child-3', name: 'child-3', deviceCode: 'D-03', x: 2, y: 60, width: 96, height: 38 },
        ],
      },
    ])
    stubRealtimeList([
      createRealtimeItem('D-01', 'running'),
      createRealtimeItem('D-02', 'normal'),
      createRealtimeItem('D-03', 'pause_running', 'CUT'),
    ])
    stubEmptyRuntimeSideData()

    const data = await loadCssMapData()

    expect(data.devices.map((device) => device.id)).toEqual(['child-1', 'child-2', 'child-3'])
    expect(data.devices.map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual([
      { x: 12.4, y: 24, w: 48, h: 24 },
      { x: 71.2, y: 24, w: 56.4, h: 24 },
      { x: 12.4, y: 68, w: 115.2, h: 30.4 },
    ])
    expect(data.devices[0]?.polygon).toEqual([
      { x: 0, y: 0 },
      { x: 48, y: 0 },
      { x: 24, y: 24 },
    ])
    expect(data.devices[0]?.contentLayout).toBe('right-l-shape')
    expect(data.devices.map((device) => device.runtime.status)).toEqual([
      'production',
      'plannedStop',
      'changeover',
    ])
  })

  it('STI375 与 STI450 系列设备名只显示编号，其他机型保持原名', async () => {
    stubFactoryMapConfig([
      {
        id: 'vulcanization-group',
        name: 'STI450',
        section: 'vulcanization1',
        x: 10,
        y: 20,
        width: 120,
        height: 80,
        children: [
          { id: 'sti450', name: 'STI450-1A10', deviceCode: '1A10', x: 0, y: 0, width: 20, height: 100 },
          { id: 'sti450vx', name: 'STI450VX-1C07', deviceCode: '1C07', x: 20, y: 0, width: 20, height: 100 },
          { id: 'sti450mvx', name: 'STI450MVX-2B22', deviceCode: '2B22', x: 40, y: 0, width: 20, height: 100 },
          { id: 'sti375', name: 'STI375-1A01', deviceCode: '1A01', x: 60, y: 0, width: 20, height: 100 },
          { id: 'hti', name: 'HTI-2A01', deviceCode: '2A01', x: 80, y: 0, width: 20, height: 100 },
        ],
      },
    ])
    stubRealtimeList([])
    stubEmptyRuntimeSideData()

    const data = await loadCssMapData()

    expect(data.devices.map((device) => device.name)).toEqual([
      '1A10',
      '1C07',
      '2B22',
      '1A01',
      'HTI-2A01',
    ])
  })

  it('加载地图配置时绕过浏览器静态缓存', async () => {
    stubFactoryMapConfig([])
    stubEmptyRuntimeSideData()

    await loadCssMapData()

    expect(fetch).toHaveBeenCalledWith(
      '/static/factory-map/devices.json',
      { cache: 'no-store' },
    )
  })

  it('通过 window.mapMock(true) 切换到地图 mock 运行态数据', async () => {
    const win = stubBrowserWindow()
    installCssMapMockSwitch()
    stubFactoryMapConfig([
      createMapDevice('mock-1', 'MOCK-01'),
      createMapDevice('mock-2', 'MOCK-02'),
    ])

    expect(typeof win.mapMock).toBe('function')
    win.mapMock?.(true)

    const data = await loadCssMapData()

    expect(getDeviceRealtimeList).not.toHaveBeenCalled()
    expect(getScheduleDeviceLoadByMonth).not.toHaveBeenCalled()
    expect(getScheduleChangePoint).not.toHaveBeenCalled()
    expect(data.devices).toHaveLength(2)
    expect(data.devices[0]?.runtime.status).not.toBeNull()
    expect(data.devices[0]?.runtime.loadRate).not.toBeNull()
  })
})
