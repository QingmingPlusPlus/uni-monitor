import { drawHorizontalHeader } from './drawHeader'
import { drawLoadRate } from './drawLoadRate'
import { drawHorizontalMarkerRow } from './drawMarkers'
import { clamp } from './canvasText'
import type { DrawRect, SpriteCssMapDeviceCardDrawOptions, SpriteCssMapDeviceColorPlan } from './types'

function drawWideBody(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const rateWidth = clamp(rect.w * 0.31, 26, 96)
  const detailX = rect.x + rateWidth
  const rowHeight = rect.h / 2

  drawLoadRate(context, options.device, {
    x: rect.x,
    y: rect.y,
    w: rateWidth,
    h: rect.h,
  }, colorPlan)

  context.save()
  context.strokeStyle = 'rgba(21, 43, 70, 0.12)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(detailX, rect.y)
  context.lineTo(detailX, rect.y + rect.h)
  context.stroke()
  context.restore()

  drawHorizontalMarkerRow(context, options, {
    x: detailX + 5,
    y: rect.y + 2,
    w: Math.max(1, rect.w - rateWidth - 9),
    h: Math.max(1, rowHeight - 3),
  }, 'staff')
  drawHorizontalMarkerRow(context, options, {
    x: detailX + 5,
    y: rect.y + rowHeight,
    w: Math.max(1, rect.w - rateWidth - 9),
    h: Math.max(1, rowHeight - 3),
  }, 'fiveM')
}

export function drawHorizontalCard(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const headerHeight = Math.min(clamp(rect.h * 0.36, 22, 52), rect.h * 0.62)
  const headerRect: DrawRect = {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: headerHeight,
  }
  const bodyRect: DrawRect = {
    x: rect.x,
    y: headerRect.y + headerRect.h,
    w: rect.w,
    h: Math.max(1, rect.h - headerRect.h),
  }

  drawHorizontalHeader(context, options, headerRect, colorPlan)
  drawWideBody(context, options, bodyRect, colorPlan)
}
