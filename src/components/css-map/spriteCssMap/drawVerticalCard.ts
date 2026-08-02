import { drawVerticalHeader } from './drawHeader'
import { drawVerticalLoadRate } from './drawLoadRate'
import { drawVerticalMarkerGrid } from './drawMarkers'
import type { DrawRect, SpriteCssMapDeviceCardDrawOptions, SpriteCssMapDeviceColorPlan } from './types'

export function drawVerticalCard(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const nameHeight = rect.h * 0.24
  const statusHeight = rect.h * 0.15
  const staffHeight = rect.h * 0.25
  const fiveMHeight = rect.h * 0.19
  const loadHeight = Math.max(1, rect.h - nameHeight - statusHeight - staffHeight - fiveMHeight)
  const nameRect: DrawRect = {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: nameHeight,
  }
  const statusRect: DrawRect = {
    x: rect.x,
    y: nameRect.y + nameRect.h,
    w: rect.w,
    h: statusHeight,
  }
  const staffRect: DrawRect = {
    x: rect.x + 4,
    y: statusRect.y + statusRect.h,
    w: Math.max(1, rect.w - 8),
    h: staffHeight,
  }
  const fiveMRect: DrawRect = {
    x: rect.x + 4,
    y: staffRect.y + staffRect.h,
    w: Math.max(1, rect.w - 8),
    h: fiveMHeight,
  }
  const loadRect: DrawRect = {
    x: rect.x,
    y: fiveMRect.y + fiveMRect.h,
    w: rect.w,
    h: loadHeight,
  }

  drawVerticalHeader(context, options, nameRect, statusRect, colorPlan)
  drawVerticalMarkerGrid(context, options, staffRect, 'staff')
  drawVerticalMarkerGrid(context, options, fiveMRect, 'fiveM')
  drawVerticalLoadRate(context, options.device, loadRect, colorPlan)

  context.save()
  context.strokeStyle = 'rgba(21, 43, 70, 0.12)'
  context.lineWidth = 1
  const separatorYs = [staffRect.y, fiveMRect.y, loadRect.y]
  separatorYs.forEach((y) => {
    context.beginPath()
    context.moveTo(rect.x, y)
    context.lineTo(rect.x + rect.w, y)
    context.stroke()
  })
  context.restore()
}
