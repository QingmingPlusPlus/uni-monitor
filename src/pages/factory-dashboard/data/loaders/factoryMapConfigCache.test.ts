import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadProcessDeviceCodeMap } from './factoryMapConfigCache'

describe('loadProcessDeviceCodeMap', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('只把 visibleDeviceCodes 白名单中的设备纳入工序范围', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        source: {
          visibleDeviceCodes: ['d-01', 'D-03'],
        },
        devices: [
          {
            id: 'standalone-visible',
            section: 'pretreatment1',
            deviceCode: 'D-01',
          },
          {
            id: 'standalone-hidden',
            section: 'pretreatment1',
            deviceCode: 'D-02',
          },
          {
            id: 'device-group',
            section: 'vulcanization1',
            deviceCodes: ['D-03', 'D-04'],
            children: [
              { deviceCode: 'D-03' },
              { deviceCode: 'D-04' },
            ],
          },
        ],
      }),
    })))

    const result = await loadProcessDeviceCodeMap()

    expect([...result.pretreatment1]).toEqual(['D-01'])
    expect([...result.vulcanization1]).toEqual(['D-03'])
  })
})
