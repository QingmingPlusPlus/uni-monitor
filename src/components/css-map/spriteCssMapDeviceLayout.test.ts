import { describe, expect, it } from 'vitest'
import { planSpriteCssMapDeviceCard } from './spriteCssMapDeviceLayout'

describe('planSpriteCssMapDeviceCard', () => {
  it('小尺寸远景设备名称使用省略号且纹理保持设备比例', () => {
    const layout = planSpriteCssMapDeviceCard({
      worldWidth: 80,
      worldHeight: 41,
      screenWidth: 42,
      screenHeight: 22,
      pixelRatio: 1,
    })

    expect(layout.nameMode).toBe('ellipsis')
    expect(layout.mode).toBe('wide')
    expect(layout.logicalWidth / layout.logicalHeight).toBeCloseTo(80 / 41, 1)
    expect(layout.logicalHeight).toBeGreaterThanOrEqual(76)
  })

  it('放大后恢复完整名称显示', () => {
    const layout = planSpriteCssMapDeviceCard({
      worldWidth: 80,
      worldHeight: 41,
      screenWidth: 180,
      screenHeight: 92,
      pixelRatio: 1.5,
    })

    expect(layout.zoomBucket).toBe('detail')
    expect(layout.nameMode).toBe('full')
    expect(layout.pixelRatio).toBe(1.5)
  })

  it('窄高设备使用纵向排布并限制 DPR 上限', () => {
    const layout = planSpriteCssMapDeviceCard({
      worldWidth: 36,
      worldHeight: 120,
      screenWidth: 180,
      screenHeight: 600,
      pixelRatio: 3,
    })

    expect(layout.mode).toBe('stack')
    expect(layout.nameMode).toBe('full')
    expect(layout.pixelRatio).toBe(2)
    expect(layout.logicalHeight).toBeLessThanOrEqual(640)
  })

  it('截图中的细长子设备保留足够纹理宽度并在放大后显示完整名称', () => {
    const layout = planSpriteCssMapDeviceCard({
      worldWidth: 21.6,
      worldHeight: 98.7,
      screenWidth: 96,
      screenHeight: 438,
      pixelRatio: 1,
    })

    expect(layout.mode).toBe('stack')
    expect(layout.nameMode).toBe('full')
    expect(layout.logicalWidth).toBeGreaterThanOrEqual(76)
    expect(layout.logicalHeight / layout.logicalWidth).toBeCloseTo(98.7 / 21.6, 1)
  })
})
