import { getCssMapRightLShapeMetrics } from '../cssMapDeviceShape'
import { planCssMapRightLShapeContent } from '../cssMapDeviceContentLayout'
import { drawHorizontalHeader } from './drawHeader'
import { drawLoadRate } from './drawLoadRate'
import { drawHorizontalMarkerRow } from './drawMarkers'
import { clamp } from './canvasText'
import type { DrawRect, SpriteCssMapDeviceCardDrawOptions, SpriteCssMapDeviceColorPlan } from './types'

export function drawRightLShapeCard(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): boolean {
  const metrics = getCssMapRightLShapeMetrics(options.device)
  if (!metrics) return false

  const contentPlan = planCssMapRightLShapeContent(
    metrics.legStartRatio,
    metrics.barHeightRatio,
  )
  const legX = rect.x + rect.w * metrics.legStartRatio
  const barBottom = rect.y + rect.h * metrics.barHeightRatio
  const headerHeight = rect.h * contentPlan.headerHeightRatio
  const headerBottom = rect.y + headerHeight
  const bodyHeight = Math.max(1, rect.h * contentPlan.bodyHeightRatio)
  const loadRateWidth = Math.max(1, rect.w * contentPlan.loadRateWidthRatio)
  const detailsX = rect.x + rect.w * contentPlan.detailsLeftRatio
  const detailsWidth = Math.max(1, rect.w * contentPlan.detailsWidthRatio)
  const detailRowHeight = bodyHeight / 2
  const inset = clamp(Math.min(detailRowHeight, detailsWidth) * 0.08, 2, 5)

  drawHorizontalHeader(context, options, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: headerHeight,
  }, colorPlan)
  drawLoadRate(context, options.device, {
    x: rect.x,
    y: headerBottom,
    w: loadRateWidth,
    h: bodyHeight,
  }, colorPlan)
  drawHorizontalMarkerRow(context, options, {
    x: detailsX + inset,
    y: headerBottom + 1,
    w: Math.max(1, detailsWidth - inset * 2),
    h: Math.max(1, detailRowHeight - 2),
  }, 'staff')
  drawHorizontalMarkerRow(context, options, {
    x: detailsX + inset,
    y: headerBottom + detailRowHeight,
    w: Math.max(1, detailsWidth - inset * 2),
    h: Math.max(1, detailRowHeight - 2),
  }, 'fiveM')

  context.save()
  context.strokeStyle = 'rgba(21, 43, 70, 0.16)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(rect.x, headerBottom)
  context.lineTo(rect.x + rect.w, headerBottom)
  context.moveTo(detailsX, headerBottom)
  context.lineTo(detailsX, barBottom)
  context.moveTo(detailsX, headerBottom + detailRowHeight)
  context.lineTo(legX, headerBottom + detailRowHeight)
  context.stroke()
  context.restore()

  return true
}
