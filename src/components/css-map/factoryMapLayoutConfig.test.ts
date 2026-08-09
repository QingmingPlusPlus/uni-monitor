import { describe, expect, it } from 'vitest'
import mapConfigJson from '../../static/factory-map/devices.json'

interface MapChild {
  id: string
  deviceCode: string
  x: number
  y: number
  width: number
  height: number
}

interface MapDevice {
  id: string
  section: string | null
  x: number
  y: number
  width: number
  height: number
  deviceCode?: string
  deviceCodes?: string[]
  children?: MapChild[]
}

interface MapConfig {
  source: {
    imageWidth: number
    imageHeight: number
    backgroundImage: string
    layoutCoordinateSystem: string
    annotatedDeviceCount: number
    visibleDeviceCodes?: string[]
  }
  sections: Array<{ id: string }>
  devices: MapDevice[]
}

interface RenderedDevice {
  id: string
  code: string
  section: string | null
  x: number
  y: number
  width: number
  height: number
}

const mapConfig = mapConfigJson as MapConfig

const expectedVisibleCodes = [
  '1101',
  '1121',
  '1104',
  '1105',
  '1106',
  '1107',
  '1C01',
  '1C02',
  '1C03',
  '1C04',
  '1C05',
  '1C06',
  '1C07',
  '1C08',
  '1C09',
  '1B01',
  '1B02',
  '1B03',
  '1B04',
  '1B05',
  '1B06',
  '1B07',
  '1B08',
  '1B09',
  '1A01',
  '1A02',
  '1A03',
  '1A04',
  '1A05',
  '1A06',
  '1A07',
  '1A08',
  '1A09',
  '1A10',
  '1A11',
  '1A12',
  '1A13',
  '1A14',
  '1A15',
  '1A16',
  '1A17',
  '1A18',
  '1A19',
  '1A20',
  '1110',
  '1111',
] as const

function codeRange(prefix: string, start: number, end: number): string[] {
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `${prefix}${String(start + index).padStart(2, '0')}`,
  )
}

function flattenDevices(): RenderedDevice[] {
  return mapConfig.devices.flatMap((device) => {
    if (device.children?.length) {
      return device.children.map((child) => ({
        id: child.id,
        code: child.deviceCode.toUpperCase(),
        section: device.section,
        x: device.x + device.width * child.x / 100,
        y: device.y + device.height * child.y / 100,
        width: device.width * child.width / 100,
        height: device.height * child.height / 100,
      }))
    }
    if (!device.deviceCode) return []
    return [{
      id: device.id,
      code: device.deviceCode.toUpperCase(),
      section: device.section,
      x: device.x,
      y: device.y,
      width: device.width,
      height: device.height,
    }]
  })
}

function expectRect(
  device: RenderedDevice | undefined,
  expected: Pick<RenderedDevice, 'x' | 'y' | 'width' | 'height'>,
): void {
  expect(device).toBeDefined()
  expect(device?.x).toBeCloseTo(expected.x, 6)
  expect(device?.y).toBeCloseTo(expected.y, 6)
  expect(device?.width).toBeCloseTo(expected.width, 6)
  expect(device?.height).toBeCloseTo(expected.height, 6)
}

describe('factory floorplan layout config', () => {
  it('声明 PDF 底图坐标系、全量标注数量和当前显示白名单', () => {
    expect(mapConfig.source).toMatchObject({
      imageWidth: 2060,
      imageHeight: 1280,
      backgroundImage: '/static/factory-map/factory-floorplan.png',
      layoutCoordinateSystem: 'factory-floorplan-v1',
      annotatedDeviceCount: 151,
      visibleDeviceCodes: expectedVisibleCodes,
    })

    const sectionCounts = mapConfig.sections.reduce<Record<string, number>>((counts, section) => {
      counts[section.id] = (counts[section.id] ?? 0) + 1
      return counts
    }, {})
    expect(sectionCounts).toEqual({
      pretreatment1: 1,
      pretreatment2: 1,
      posttreatment1: 3,
      posttreatment2: 3,
      vulcanization1: 2,
      vulcanization2: 2,
    })
  })

  it('保留全量点位定义，但只把本次 slices JSON 的 46 台列入显示白名单', () => {
    const rendered = flattenDevices()
    const codes = rendered.map((device) => device.code).sort()
    const nodeIds = mapConfig.devices.flatMap((device) => [
      device.id,
      ...(device.children?.map((child) => child.id) ?? []),
    ])

    expect(mapConfig.devices).toHaveLength(91)
    expect(rendered).toHaveLength(207)
    expect(new Set(codes).size).toBe(207)
    expect([...(mapConfig.source.visibleDeviceCodes ?? [])].sort()).toEqual(
      [...expectedVisibleCodes].sort(),
    )
    expectedVisibleCodes.forEach((code) => expect(codes).toContain(code))
    expect(new Set(nodeIds).size).toBe(nodeIds.length)

    rendered.forEach((device) => {
      expect(device.width, device.code).toBeGreaterThan(0)
      expect(device.height, device.code).toBeGreaterThan(0)
      expect(device.x, device.code).toBeGreaterThanOrEqual(0)
      expect(device.y, device.code).toBeGreaterThanOrEqual(0)
      expect(device.x + device.width, device.code).toBeLessThanOrEqual(mapConfig.source.imageWidth)
      expect(device.y + device.height, device.code).toBeLessThanOrEqual(mapConfig.source.imageHeight)
    })
  })

  it('保留全量多机台分组和当前手动粘接设备的独立子设备关系', () => {
    const expectedGroups: Record<string, string[]> = {
      'layout-factory1-region-n1': codeRange('1A', 1, 9),
      'layout-factory1-region-n2': codeRange('1A', 10, 20),
      'layout-factory1-region-n3': codeRange('1B', 1, 9),
      'layout-factory1-region-n4': codeRange('1B', 10, 20),
      'layout-factory1-region-n5': codeRange('1C', 1, 9),
      'layout-factory1-region-n6': [...codeRange('1C', 10, 18), '1C21'],
      'layout-factory1-region-n7': codeRange('1D', 5, 12),
      'layout-factory1-region-n8': codeRange('1D', 16, 23),
      'layout-factory1-region-n9': codeRange('1D', 24, 31),
      'layout-factory2-region-n1': codeRange('2A', 1, 13),
      'layout-factory2-region-n2': codeRange('2A', 14, 18),
      'layout-factory2-region-n3': codeRange('2B', 1, 12),
      'layout-factory2-region-n4': codeRange('2B', 13, 21),
      'layout-factory2-region-n5': codeRange('2B', 22, 24),
    }

    Object.entries(expectedGroups).forEach(([id, expectedCodes]) => {
      const group = mapConfig.devices.find((device) => device.id === id)
      expect(group, id).toBeDefined()
      expect(group?.children?.map((child) => child.deviceCode)).toEqual(expectedCodes)
      expect(group?.deviceCodes).toEqual(expectedCodes)
    })

    const manualGroup = mapConfig.devices.find(
      (device) => device.id === 'pretreatment1-manual-adhesion-1-4',
    )

    expect(manualGroup?.deviceCodes).toEqual(['1104', '1105', '1106', '1107'])
    expect(manualGroup?.children?.map((child) => child.deviceCode)).toEqual(
      manualGroup?.deviceCodes,
    )
  })

  it('按实际底图比例保留全量一工厂和二工厂设备定义', () => {
    const rendered = flattenDevices()
    const firstFactoryAnnotated = rendered.filter((device) => /^[1][A-D][0-9]{2}$/.test(device.code))
    const secondFactoryAnnotated = rendered.filter((device) => /^2[AB][0-9]{2}$/.test(device.code))

    expect(firstFactoryAnnotated).toHaveLength(83)
    expect(secondFactoryAnnotated).toHaveLength(42)
    expect(Math.max(...firstFactoryAnnotated.map((device) => device.y + device.height))).toBeLessThan(592)
    expect(Math.min(...secondFactoryAnnotated.map((device) => device.y))).toBeGreaterThan(799)

    const firstRow = mapConfig.devices.find((device) => device.id === 'layout-factory1-region-n1')
    const secondRow = mapConfig.devices.find((device) => device.id === 'layout-factory2-region-n1')
    expect(firstRow).toMatchObject({ x: 671, y: 450, width: 214, height: 58 })
    expect(secondRow).toMatchObject({ x: 553.9, y: 820.35, width: 391.57, height: 82.13 })
  })

  it('保留全量来源中的推断 code 和唯一工厂冲突设备', () => {
    const byCode = new Map(flattenDevices().map((device) => [device.code, device]))

    expect(['1D24', '1D25', '1D26', '2311', '2318'].every((code) => byCode.has(code))).toBe(true)
    expect(byCode.get('2338')).toMatchObject({ section: null })
  })

  it('按新截图坐标放置非 1C 设备', () => {
    const byCode = new Map(flattenDevices().map((device) => [device.code, device]))

    expectRect(byCode.get('1101'), { x: 93, y: 319, width: 108, height: 49 })
    expectRect(byCode.get('1121'), { x: 88, y: 436, width: 108, height: 49 })
    expectRect(byCode.get('1104'), { x: 540, y: 185, width: 48, height: 10 })
    expectRect(byCode.get('1105'), { x: 540, y: 212, width: 48, height: 10 })
    expectRect(byCode.get('1106'), { x: 540, y: 226, width: 48, height: 10 })
    expectRect(byCode.get('1107'), { x: 540, y: 250, width: 48, height: 10 })
    expectRect(byCode.get('1110'), { x: 550, y: 292, width: 50, height: 34 })
    expectRect(byCode.get('1111'), { x: 550, y: 337, width: 50, height: 34 })
  })

  it('让 1C01–1C09 等宽等高并保留统一水平空隙', () => {
    const devices = flattenDevices()
      .filter((device) => /^1C0[1-9]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(9)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 671 + index * 24,
        y: 291,
        width: 22,
        height: 58,
      })
    })

    const horizontalSteps = devices.slice(1).map(
      (device, index) => device.x - devices[index].x,
    )
    horizontalSteps.forEach((step) => expect(step).toBeCloseTo(24, 6))

    const horizontalGaps = devices.slice(1).map(
      (device, index) => device.x - devices[index].x - devices[index].width,
    )
    horizontalGaps.forEach((gap) => expect(gap).toBeCloseTo(2, 6))
  })

  it('让 1B01–1B09 位于 1C01–1C09 正下方并复用相同尺寸和间距', () => {
    const devices = flattenDevices()
      .filter((device) => /^1B0[1-9]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))
    const upperDevices = flattenDevices()
      .filter((device) => /^1C0[1-9]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(9)
    expect(upperDevices).toHaveLength(9)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 671 + index * 24,
        y: 381,
        width: 22,
        height: 58,
      })
      expect(device.x).toBeCloseTo(upperDevices[index].x, 6)
      expect(device.width).toBeCloseTo(upperDevices[index].width, 6)
      expect(device.height).toBeCloseTo(upperDevices[index].height, 6)
    })
  })

  it('让 1A01–1A09 位于 1B01–1B09 正下方并复用相同尺寸和间距', () => {
    const devices = flattenDevices()
      .filter((device) => /^1A0[1-9]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))
    const upperDevices = flattenDevices()
      .filter((device) => /^1B0[1-9]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(9)
    expect(upperDevices).toHaveLength(9)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 671 + index * 24,
        y: 450,
        width: 22,
        height: 58,
      })
      expect(device.x).toBeCloseTo(upperDevices[index].x, 6)
      expect(device.width).toBeCloseTo(upperDevices[index].width, 6)
      expect(device.height).toBeCloseTo(upperDevices[index].height, 6)
    })
  })

  it('让 1A10–1A20 从指定坐标开始按统一尺寸和间距排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^1A1[0-9]$|^1A20$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(11)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 908 + index * 24,
        y: 450,
        width: 22,
        height: 58,
      })
    })

    const horizontalSteps = devices.slice(1).map(
      (device, index) => device.x - devices[index].x,
    )
    horizontalSteps.forEach((step) => expect(step).toBeCloseTo(24, 6))

    const horizontalGaps = devices.slice(1).map(
      (device, index) => device.x - devices[index].x - devices[index].width,
    )
    horizontalGaps.forEach((gap) => expect(gap).toBeCloseTo(2, 6))
  })
})
