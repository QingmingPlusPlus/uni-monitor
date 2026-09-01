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
  name?: string
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
    backgroundImage?: string
    backgroundOpacity?: number
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
  '1102',
  '1113',
  '1123',
  '1114',
  '1115',
  '1120',
  '1119',
  '1118',
  '1117',
  '1116',
  '1122',
  '1112',
  '1110',
  '1121',
  '1104',
  '1105',
  '1106',
  '1107',
  '3101',
  '3103',
  '3104',
  '3115',
  '3116',
  '3113',
  '3114',
  '1C01',
  '1C02',
  '1C03',
  '1C04',
  '1C05',
  '1C06',
  '1C07',
  '1C08',
  '1C09',
  '1C10',
  '1C11',
  '1C12',
  '1C13',
  '1C14',
  '1C15',
  '1C16',
  '1C17',
  '1C18',
  '1C21',
  '1D05',
  '1D06',
  '1D07',
  '1D08',
  '1D09',
  '1D10',
  '1D11',
  '1D12',
  '1D16',
  '1D17',
  '1D18',
  '1D19',
  '1D20',
  '1D21',
  '1D22',
  '1D23',
  '1D24',
  '1D25',
  '1D26',
  '1D27',
  '1D28',
  '1D29',
  '1D30',
  '1D31',
  '1B01',
  '1B02',
  '1B03',
  '1B04',
  '1B05',
  '1B06',
  '1B07',
  '1B08',
  '1B09',
  '1B10',
  '1B11',
  '1B12',
  '1B13',
  '1B14',
  '1B15',
  '1B16',
  '1B17',
  '1B18',
  '1B19',
  '1B20',
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
  '2A01',
  '2A02',
  '2A03',
  '2A04',
  '2A05',
  '2A06',
  '2A07',
  '2A08',
  '2A09',
  '2A10',
  '2A11',
  '2A12',
  '2A13',
  '2A14',
  '2A15',
  '2A16',
  '2A17',
  '2A18',
  '2B01',
  '2B02',
  '2B03',
  '2B04',
  '2B05',
  '2B06',
  '2B07',
  '2B08',
  '2B09',
  '2B10',
  '2B11',
  '2B12',
  '2B13',
  '2B14',
  '2B15',
  '2B16',
  '2B17',
  '2B18',
  '2B19',
  '2B20',
  '2B21',
  '2B22',
  '2B23',
  '2B24',
  '3111',
  '3112',
  '3106',
  '3107',
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
  it('声明当前底图坐标尺寸、全量标注数量和当前显示白名单', () => {
    expect(mapConfig.source).toMatchObject({
      imageWidth: 1650,
      imageHeight: 953,
      backgroundImage: '/static/factory-map/factory-floorplan.png',
      backgroundOpacity: 0.46,
      backgroundVisibleHeight: 852,
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

  it('保留全量点位定义，并只渲染当前显示白名单', () => {
    const rendered = flattenDevices()
    const codes = rendered.map((device) => device.code).sort()
    const nodeIds = mapConfig.devices.flatMap((device) => [
      device.id,
      ...(device.children?.map((child) => child.id) ?? []),
    ])

    expect(mapConfig.devices).toHaveLength(93)
    expect(rendered).toHaveLength(209)
    expect(new Set(codes).size).toBe(209)
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
    })

    const visibleCodes = new Set<string>(expectedVisibleCodes)
    const visibleDevices = rendered.filter((device) => visibleCodes.has(device.code))
    expect(visibleDevices).toHaveLength(expectedVisibleCodes.length)
    visibleDevices.forEach((device) => {
      expect(device.x + device.width, device.code).toBeLessThanOrEqual(mapConfig.source.imageWidth)
      expect(device.y + device.height, device.code).toBeLessThanOrEqual(mapConfig.source.imageHeight)
    })
  })

  it('按评审坐标纵向排列 1D05–1D12 加硫设备', () => {
    const renderedByCode = new Map(flattenDevices().map((device) => [device.code, device]))
    const expected = [
      ['1D05', 79, 33, 21],
      ['1D06', 102, 33, 21],
      ['1D07', 125, 34, 20],
      ['1D08', 147, 34, 20],
      ['1D09', 169, 34, 20],
      ['1D10', 191, 34, 20],
      ['1D11', 213, 34, 20],
      ['1D12', 235, 34, 20],
    ] as const

    expected.forEach(([code, y, width, height]) => {
      expectRect(renderedByCode.get(code), { x: 815, y, width, height })
    })
  })

  it('按评审坐标显示 CG 连接设备 3–7', () => {
    const renderedByCode = new Map(flattenDevices().map((device) => [device.code, device]))
    const expected = [
      ['1120', 'CG连接7', 352, 397, 39, 46],
      ['1119', 'CG连接6', 408, 398, 36, 46],
      ['1118', 'CG连接5', 408, 467, 35, 48],
      ['1117', 'CG连接4', 464, 423, 28, 33],
      ['1116', 'CG连接3', 464, 471, 28, 36],
    ] as const

    expected.forEach(([code, name, x, y, width, height]) => {
      const device = renderedByCode.get(code)
      expect(device).toMatchObject({ x, y, width, height })
      expect(mapConfig.devices.find((item) => item.deviceCode === code)?.name).toBe(name)
    })
  })

  it('按评审坐标显示 WB-2 和 CG 粘接 10/11/13/14', () => {
    const expected = [
      ['3101', 'WB-2', 111, 639, 105, 52],
      ['3115', 'CG粘接-13', 278, 647, 72, 48],
      ['3116', 'CG粘接-14', 278, 596, 72, 48],
      ['3113', 'CG粘接-10', 356, 596, 72, 48],
      ['3114', 'CG粘接-11', 356, 647, 72, 48],
    ] as const
    const renderedByCode = new Map(flattenDevices().map((device) => [device.code, device]))

    expected.forEach(([code, name, x, y, width, height]) => {
      const device = renderedByCode.get(code)
      expect(device).toMatchObject({ x, y, width, height })
      expect(mapConfig.devices.find((item) => item.deviceCode === code)?.name).toBe(name)
    })
  })

  it('按评审坐标显示自动喷涂粘接-1', () => {
    const device = mapConfig.devices.find((item) => item.deviceCode === '1110')

    expect(device).toMatchObject({
      name: '自动喷涂粘接-1',
      x: 233,
      y: 441,
      width: 112,
      height: 56,
    })
  })

  it('按评审坐标显示 CG 粘接-12', () => {
    const device = mapConfig.devices.find((item) => item.deviceCode === '1122')

    expect(device).toMatchObject({
      name: 'CG粘接-12',
      x: 533,
      y: 470,
      width: 70,
      height: 47,
      section: 'pretreatment1',
    })
  })

  it('按评审坐标纵向排列 1D16–1D23 加硫设备', () => {
    const renderedByCode = new Map(flattenDevices().map((device) => [device.code, device]))
    const expected = [
      ['1D16', 73],
      ['1D17', 95],
      ['1D18', 117],
      ['1D19', 139],
      ['1D20', 161],
      ['1D21', 183],
      ['1D22', 205],
      ['1D23', 227],
    ] as const

    expected.forEach(([code, y]) => {
      expectRect(renderedByCode.get(code), { x: 948, y, width: 34, height: 20 })
    })
  })

  it('按评审坐标分组纵向排列 1D24–1D31 加硫设备', () => {
    const renderedByCode = new Map(flattenDevices().map((device) => [device.code, device]))
    const expected = [
      ['1D24', 52],
      ['1D25', 74],
      ['1D26', 96],
      ['1D27', 145],
      ['1D28', 167],
      ['1D29', 189],
      ['1D30', 211],
      ['1D31', 233],
    ] as const

    expected.forEach(([code, y]) => {
      expectRect(renderedByCode.get(code), { x: 989, y, width: 34, height: 20 })
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
    expect(Math.min(...secondFactoryAnnotated.map((device) => device.y))).toBeGreaterThanOrEqual(597)

    const firstRow = mapConfig.devices.find((device) => device.id === 'layout-factory1-region-n1')
    const secondRow = mapConfig.devices.find((device) => device.id === 'layout-factory2-region-n1')
    expect(firstRow).toMatchObject({ x: 671, y: 450, width: 214, height: 58 })
    expect(secondRow).toMatchObject({ x: 509, y: 597, width: 310, height: 58 })
  })

  it('保留全量来源中的推断 code 和唯一工厂冲突设备', () => {
    const byCode = new Map(flattenDevices().map((device) => [device.code, device]))

    expect(['1D24', '1D25', '1D26', '2311', '2318'].every((code) => byCode.has(code))).toBe(true)
    expect(byCode.get('2338')).toMatchObject({ section: null })
  })

  it('按新截图坐标放置非 1C 设备', () => {
    const byCode = new Map(flattenDevices().map((device) => [device.code, device]))

    expectRect(byCode.get('1101'), { x: 93, y: 319, width: 108, height: 49 })
    expectRect(byCode.get('1102'), { x: 368, y: 286, width: 24, height: 16 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '1102')?.name).toBe('干研磨生产线1')
    expectRect(byCode.get('1113'), { x: 414, y: 308, width: 40, height: 20 })
    expectRect(byCode.get('1123'), { x: 414, y: 337, width: 40, height: 20 })
    expectRect(byCode.get('1114'), { x: 471, y: 289, width: 24, height: 28 })
    expectRect(byCode.get('1115'), { x: 471, y: 331, width: 24, height: 28 })
    expectRect(byCode.get('1111'), { x: 550, y: 293, width: 50, height: 34 })
    expectRect(byCode.get('1112'), { x: 550, y: 336, width: 50, height: 34 })
    expectRect(byCode.get('1121'), { x: 88, y: 436, width: 108, height: 49 })
    expectRect(byCode.get('1104'), { x: 540, y: 185, width: 48, height: 10 })
    expectRect(byCode.get('1105'), { x: 540, y: 212, width: 48, height: 10 })
    expectRect(byCode.get('1106'), { x: 540, y: 226, width: 48, height: 10 })
    expectRect(byCode.get('1107'), { x: 540, y: 250, width: 48, height: 10 })
    expectRect(byCode.get('3103'), { x: 75, y: 756, width: 18, height: 40 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '3103')?.name).toBe('手动粘接-5')
    expectRect(byCode.get('3104'), { x: 114, y: 756, width: 18, height: 40 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '3104')?.name).toBe('手动粘接-6')
    expectRect(byCode.get('3111'), { x: 160, y: 787, width: 35, height: 40 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '3111')?.name).toBe('CG粘接-8')
    expectRect(byCode.get('3112'), { x: 219, y: 787, width: 35, height: 40 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '3112')?.name).toBe('CG粘接-9')
    expectRect(byCode.get('3106'), { x: 272, y: 780, width: 26, height: 44 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '3106')?.name).toBe('自动喷涂粘接-4')
    expectRect(byCode.get('3107'), { x: 309, y: 780, width: 26, height: 44 })
    expect(mapConfig.devices.find((device) => device.deviceCode === '3107')?.name).toBe('自动喷涂粘接-5')
    expectRect(byCode.get('1110'), { x: 233, y: 441, width: 112, height: 56 })
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

  it('让 1C10–1C18 和 1C21 从指定坐标开始按统一尺寸和间距排列', () => {
    const expectedCodes = [...codeRange('1C', 10, 18), '1C21']
    const byCode = new Map(flattenDevices().map((device) => [device.code, device]))
    const devices = expectedCodes.map((code) => byCode.get(code))

    devices.forEach((device, index) => {
      expectRect(device, {
        x: 906 + index * 24,
        y: 291,
        width: 22,
        height: 58,
      })
    })

    const horizontalSteps = devices.slice(1).map(
      (device, index) => (device?.x ?? 0) - (devices[index]?.x ?? 0),
    )
    horizontalSteps.forEach((step) => expect(step).toBeCloseTo(24, 6))

    const horizontalGaps = devices.slice(1).map(
      (device, index) => (device?.x ?? 0) - (devices[index]?.x ?? 0) - (devices[index]?.width ?? 0),
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

  it('让 1B10–1B20 从指定坐标开始按统一尺寸和间距排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^1B1[0-9]$|^1B20$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(11)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 906 + index * 24,
        y: 381,
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

  it('让 2A01–2A13 从指定坐标开始按统一尺寸和间距横向排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^2A(?:0[1-9]|1[0-3])$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(13)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 509 + index * 24,
        y: 597,
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

  it('让 2A14–2A18 参考上一组从指定坐标开始横向排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^2A1[4-8]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(5)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 879 + index * 24,
        y: 597,
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

  it('让 2B01–2B12 从指定坐标开始按统一尺寸和间距横向排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^2B(?:0[1-9]|1[0-2])$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(12)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 529 + index * 24,
        y: 776,
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

  it('让 2B13–2B21 从指定坐标开始按统一尺寸和间距横向排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^2B1[3-9]$|^2B20$|^2B21$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(9)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 882 + index * 24,
        y: 774,
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

  it('让 2B22–2B24 从指定坐标开始按统一尺寸和间距横向排列', () => {
    const devices = flattenDevices()
      .filter((device) => /^2B2[2-4]$/.test(device.code))
      .sort((left, right) => left.code.localeCompare(right.code))

    expect(devices).toHaveLength(3)
    devices.forEach((device, index) => {
      expectRect(device, {
        x: 1265 + index * 24,
        y: 780,
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
