import { describe, expect, it } from 'vitest'
import {
  createCssMapScaledPolygon,
  getCssMapDeviceClipPath,
  isCssMapDevicePointInsideShape,
  isValidCssMapDevicePolygon,
} from './cssMapDeviceShape'

const triangle = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 50, y: 80 },
]

describe('cssMapDeviceShape', () => {
  it('将设备局部顶点转换为 CSS clip-path', () => {
    expect(getCssMapDeviceClipPath({
      w: 100,
      h: 80,
      polygon: triangle,
    })).toBe('polygon(0% 0%, 100% 0%, 50% 100%)')
  })

  it('按多边形而不是外接矩形判断设备命中', () => {
    const device = {
      w: 100,
      h: 80,
      polygon: triangle,
    }

    expect(isCssMapDevicePointInsideShape(device, 0.5, 0.4)).toBe(true)
    expect(isCssMapDevicePointInsideShape(device, 0.5, 1)).toBe(true)
    expect(isCssMapDevicePointInsideShape(device, 0.05, 0.95)).toBe(false)
  })

  it('缩放子设备多边形并拒绝退化或越界顶点', () => {
    expect(createCssMapScaledPolygon(triangle, 100, 80, 50, 40)).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 25, y: 40 },
    ])
    expect(isValidCssMapDevicePolygon([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ], 20, 20)).toBe(false)
    expect(isValidCssMapDevicePolygon([
      { x: 0, y: 0 },
      { x: 21, y: 0 },
      { x: 10, y: 10 },
    ], 20, 20)).toBe(false)
  })
})
