import { formatSpriteCssMapLoadRate } from './deviceColorPlan'
import { clamp, createFont } from './canvasText'
import type { CssMapDevice } from '../css3dMapTypes'
import type { DrawRect, SpriteCssMapDeviceColorPlan } from './types'

export function drawLoadRate(
  context: CanvasRenderingContext2D,
  device: CssMapDevice,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  context.save()
  context.fillStyle = colorPlan.loadRateBackground
  context.fillRect(rect.x, rect.y, rect.w, rect.h)
  context.fillStyle = '#14213d'
  context.font = createFont(900, clamp(Math.min(rect.w, rect.h) * 0.35, 8, 19))
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    formatSpriteCssMapLoadRate(device.runtime.loadRate),
    rect.x + rect.w / 2,
    rect.y + rect.h / 2,
    rect.w - 5,
  )
  context.restore()
}

export function drawVerticalLoadRate(
  context: CanvasRenderingContext2D,
  device: CssMapDevice,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const labelWidth = clamp(rect.w * 0.38, 22, 52)
  const valueRect: DrawRect = {
    x: rect.x + labelWidth,
    y: rect.y,
    w: Math.max(1, rect.w - labelWidth),
    h: rect.h,
  }

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.fillRect(rect.x, rect.y, labelWidth, rect.h)
  context.fillStyle = 'rgba(20, 33, 61, 0.72)'
  context.font = createFont(800, clamp(rect.h * 0.3, 7, 12))
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('负荷率', rect.x + labelWidth / 2, rect.y + rect.h / 2, labelWidth - 4)

  context.fillStyle = colorPlan.loadRateBackground
  context.fillRect(valueRect.x, valueRect.y, valueRect.w, valueRect.h)
  context.fillStyle = '#14213d'
  context.font = createFont(900, clamp(Math.min(valueRect.w, valueRect.h) * 0.38, 8, 19))
  context.fillText(
    formatSpriteCssMapLoadRate(device.runtime.loadRate),
    valueRect.x + valueRect.w / 2,
    valueRect.y + valueRect.h / 2,
    valueRect.w - 4,
  )
  context.restore()
}
