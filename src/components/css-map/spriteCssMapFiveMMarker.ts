import { getCssMapFiveMGlyph, getCssMapFiveMVisualStyle } from './css3dMapPalette'
import type { CssMapFiveMChange } from './css3dMapTypes'
import {
  resolveSpriteCssMapColorToken,
  type SpriteCssMapCanvasTheme,
} from './spriteCssMapTheme'

export interface SpriteCssMapFiveMMarkerPlan {
  readonly glyph: string
  readonly fill: string
  readonly color: string
  readonly border: string
}

export function getSpriteCssMapFiveMMarkerGlyph(change: CssMapFiveMChange): string {
  return getCssMapFiveMGlyph(change.category)
}

export function getSpriteCssMapFiveMMarkerPlan(
  change: CssMapFiveMChange,
  theme: SpriteCssMapCanvasTheme,
): SpriteCssMapFiveMMarkerPlan {
  const visualStyle = getCssMapFiveMVisualStyle(change.category)

  return {
    glyph: visualStyle.glyph,
    fill: resolveSpriteCssMapColorToken(visualStyle.fill, theme),
    color: resolveSpriteCssMapColorToken(visualStyle.color, theme),
    border: resolveSpriteCssMapColorToken(visualStyle.border, theme),
  }
}

export function drawSpriteCssMapFiveMMarker(
  context: CanvasRenderingContext2D,
  change: CssMapFiveMChange,
  x: number,
  y: number,
  size: number,
  theme: SpriteCssMapCanvasTheme,
): void {
  const plan = getSpriteCssMapFiveMMarkerPlan(change, theme)
  const halfLineWidth = 0.5
  const centerX = x + size / 2
  const centerY = y + size / 2

  context.save()
  context.beginPath()
  context.moveTo(centerX, y + halfLineWidth)
  context.lineTo(x + size - halfLineWidth, centerY)
  context.lineTo(centerX, y + size - halfLineWidth)
  context.lineTo(x + halfLineWidth, centerY)
  context.closePath()
  context.fillStyle = plan.fill
  context.fill()
  context.strokeStyle = plan.border
  context.lineWidth = 1
  context.stroke()
  context.fillStyle = plan.color
  context.font = `900 ${Math.max(6, Math.round(size * 0.56))}px system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(plan.glyph, centerX, centerY + 0.5)
  context.restore()
}
