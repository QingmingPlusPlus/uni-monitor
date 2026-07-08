import { getCssMapFiveMGlyph } from './css3dMapPalette'
import type { CssMapFiveMChange } from './css3dMapTypes'

export function getSpriteCssMapFiveMMarkerGlyph(change: CssMapFiveMChange): string {
  return getCssMapFiveMGlyph(change.category)
}

export function drawSpriteCssMapFiveMMarker(
  context: CanvasRenderingContext2D,
  change: CssMapFiveMChange,
  x: number,
  y: number,
  size: number,
): void {
  const radius = Math.max(2, size * 0.2)

  context.save()
  context.beginPath()
  context.roundRect?.(x, y, size, size, radius)
  if (!context.roundRect) {
    context.rect(x, y, size, size)
  }
  context.fillStyle = 'rgba(21, 43, 70, 0.92)'
  context.fill()
  context.strokeStyle = 'rgba(21, 43, 70, 0.2)'
  context.lineWidth = 1
  context.stroke()
  context.fillStyle = '#ffffff'
  context.font = `900 ${Math.max(9, Math.round(size * 0.62))}px system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(getSpriteCssMapFiveMMarkerGlyph(change), x + size / 2, y + size / 2 + 0.5)
  context.restore()
}
