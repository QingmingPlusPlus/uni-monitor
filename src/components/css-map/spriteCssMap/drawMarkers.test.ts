import { describe, expect, it, vi } from 'vitest'
import { drawHorizontalMarkerRow, drawVerticalMarkerGrid, drawFiveMRowBackground } from './drawMarkers'
import { drawSpriteCssMapFiveMMarker } from '../spriteCssMapFiveMMarker'
import { cssMapFiveMNeutralBackground, getCssMapFiveMCellBackground } from '../css3dMapPalette'
import type { SpriteCssMapDeviceCardDrawOptions } from './types'
import type { CssMapFiveMCategory } from '../css3dMapTypes'

vi.mock('../spriteCssMapFiveMMarker', () => ({ drawSpriteCssMapFiveMMarker: vi.fn() }))

function setup(categories: CssMapFiveMCategory[], enabled = true) {
  const fills: { color: string; x: number; y: number; w: number; h: number }[] = []
  const context = {
    fillStyle: '', save: vi.fn(), restore: vi.fn(), fillText: vi.fn(),
    fillRect(this: { fillStyle: string }, x: number, y: number, w: number, h: number) { fills.push({ color: this.fillStyle, x, y, w, h }) },
  } as unknown as CanvasRenderingContext2D
  const options = {
    display: { showFiveMChanges: enabled },
    device: { runtime: { fiveMChanges: categories.map((category, index) => ({ id: String(index), category, label: category })) } },
    theme: {},
  } as SpriteCssMapDeviceCardDrawOptions
  vi.mocked(drawSpriteCssMapFiveMMarker).mockClear()
  return { context, options, fills }
}

describe('5M 色块和图标对齐', () => {
  it.each(['vertical', 'horizontal'] as const)('%s 每个图标位于自己的同色块中心，重复类别不去重', orientation => {
    const categories: CssMapFiveMCategory[] = ['man', 'machine', 'material', 'material', 'environment', 'environment']
    const { context, options, fills } = setup(categories)
    const draw = orientation === 'vertical' ? drawVerticalMarkerGrid : drawHorizontalMarkerRow
    draw(context, options, { x: 10, y: 20, w: 240, h: 80 }, 'fiveM')
    const cells = fills.filter(fill => fill.color !== '#ffffff')
    const calls = vi.mocked(drawSpriteCssMapFiveMMarker).mock.calls
    expect(cells).toHaveLength(orientation === 'vertical' ? 6 : 5)
    expect(calls).toHaveLength(orientation === 'vertical' ? 6 : 4)
    calls.forEach(([, change, x, y, size], index) => {
      const cell = cells[index]
      expect(cell.color).toBe(getCssMapFiveMCellBackground(change.category))
      expect(x + size / 2).toBeCloseTo(cell.x + cell.w / 2)
      expect(y + size / 2).toBeCloseTo(cell.y + cell.h / 2)
      expect(size).toBeLessThanOrEqual(Math.min(cell.w, cell.h))
    })
    if (orientation === 'horizontal') {
      expect(cells[4].color).toBe(cssMapFiveMNeutralBackground)
      expect(context.fillText).toHaveBeenCalledWith('+2', expect.any(Number), expect.any(Number))
    }
  })

  it('关闭显示时没有色块或图标', () => {
    const { context, options, fills } = setup(['man'], false)
    drawFiveMRowBackground(context, options, { x: 0, y: 0, w: 200, h: 40 })
    drawVerticalMarkerGrid(context, options, { x: 0, y: 0, w: 200, h: 40 }, 'fiveM')
    expect(fills).toEqual([])
    expect(drawSpriteCssMapFiveMMarker).not.toHaveBeenCalled()
  })
})
