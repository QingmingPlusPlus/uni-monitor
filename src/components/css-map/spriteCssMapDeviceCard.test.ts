import { describe, expect, it, vi } from 'vitest'
import type {
  CssMapDevice,
  CssMapDisplayOptions,
} from './css3dMapTypes'
import {
  createSpriteCssMapDeviceTextureKey,
  drawSpriteCssMapDevicePolygon,
} from './spriteCssMapDeviceCard'
import type { SpriteCssMapDeviceCardLayout } from './spriteCssMapDeviceLayout'

describe('drawSpriteCssMapDevicePolygon', () => {
  it('将局部多边形顶点映射到目标 Canvas 并闭合路径', () => {
    const context = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    drawSpriteCssMapDevicePolygon(
      context,
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 80 },
      ],
      100,
      80,
      200,
      160,
      4,
    )

    expect(context.beginPath).toHaveBeenCalledOnce()
    expect(context.moveTo).toHaveBeenCalledWith(4, 4)
    expect(context.lineTo).toHaveBeenNthCalledWith(1, 196, 4)
    expect(context.lineTo).toHaveBeenNthCalledWith(2, 100, 156)
    expect(context.closePath).toHaveBeenCalledOnce()
  })

  it('专用内容布局会生成独立的纹理缓存键', () => {
    const device: CssMapDevice = {
      id: 'device-1',
      name: 'CG涂装-2',
      section: 'posttreatment1',
      x: 0,
      y: 0,
      w: 100,
      h: 50,
      deviceCodes: ['2324'],
      children: [],
      runtime: {
        status: 'production',
        loadRate: 80,
        staff: [],
        fiveMChanges: [],
      },
    }
    const display: CssMapDisplayOptions = {
      showStatusColor: true,
      showLoadRateColor: true,
      showStaffing: true,
      showFiveMChanges: true,
    }
    const layout: SpriteCssMapDeviceCardLayout = {
      mode: 'wide',
      nameMode: 'full',
      zoomBucket: 'near',
      logicalWidth: 200,
      logicalHeight: 100,
      pixelWidth: 400,
      pixelHeight: 200,
      pixelRatio: 2,
      cacheBucket: 'wide:full:near:200x100:dpr2',
    }

    const standardKey = createSpriteCssMapDeviceTextureKey(device, display, layout, false)
    const rightLKey = createSpriteCssMapDeviceTextureKey({
      ...device,
      contentLayout: 'right-l-shape',
    }, display, layout, false)

    expect(rightLKey).not.toBe(standardKey)
    expect(rightLKey).toContain('right-l-shape')
  })
})
