import { describe, expect, it, vi } from 'vitest'
import { drawSpriteCssMapDevicePolygon } from './spriteCssMapDeviceCard'

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
})
