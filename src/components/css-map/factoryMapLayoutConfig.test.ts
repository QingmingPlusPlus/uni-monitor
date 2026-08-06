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

describe('factory floorplan layout config', () => {
  it('声明 PDF 底图坐标系和现场标注数量', () => {
    expect(mapConfig.source).toMatchObject({
      imageWidth: 2060,
      imageHeight: 1280,
      backgroundImage: '/static/factory-map/factory-floorplan.png',
      layoutCoordinateSystem: 'factory-floorplan-v1',
      annotatedDeviceCount: 151,
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

  it('所有设备 code 和节点 id 唯一，且设备范围不越出地图', () => {
    const rendered = flattenDevices()
    const nodeIds = mapConfig.devices.flatMap((device) => [
      device.id,
      ...(device.children?.map((child) => child.id) ?? []),
    ])

    expect(rendered).toHaveLength(207)
    expect(new Set(rendered.map((device) => device.code)).size).toBe(207)
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

  it('把现场标注的多机台红框拆成独立子设备', () => {
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
  })

  it('按实际底图比例把一工厂放在上方、二工厂放在下方', () => {
    const rendered = flattenDevices()
    const firstFactoryAnnotated = rendered.filter((device) => /^[1][A-D][0-9]{2}$/.test(device.code))
    const secondFactoryAnnotated = rendered.filter((device) => /^2[AB][0-9]{2}$/.test(device.code))

    expect(firstFactoryAnnotated).toHaveLength(83)
    expect(secondFactoryAnnotated).toHaveLength(42)
    expect(Math.max(...firstFactoryAnnotated.map((device) => device.y + device.height))).toBeLessThan(592)
    expect(Math.min(...secondFactoryAnnotated.map((device) => device.y))).toBeGreaterThan(799)

    const firstRow = mapConfig.devices.find((device) => device.id === 'layout-factory1-region-n1')
    const secondRow = mapConfig.devices.find((device) => device.id === 'layout-factory2-region-n1')
    expect(firstRow).toMatchObject({ x: 800.56, y: 491.09, width: 291.46, height: 71.01 })
    expect(secondRow).toMatchObject({ x: 553.9, y: 820.35, width: 391.57, height: 82.13 })
  })

  it('补齐现场表新增 code，并保留唯一存在来源冲突的设备', () => {
    const rendered = flattenDevices()
    const byCode = new Map(rendered.map((device) => [device.code, device]))

    expect(['1D24', '1D25', '1D26', '2311', '2318'].every((code) => byCode.has(code))).toBe(true)
    expect(byCode.get('2338')).toMatchObject({ section: null })
  })
})
