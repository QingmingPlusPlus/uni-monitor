import { clamp } from './spriteCssMap/canvasText'
import { traceDeviceShape } from './spriteCssMap/canvasPrimitives'
import {
  createSpriteCssMapDeviceTextureKey,
  formatSpriteCssMapLoadRate,
  getSpriteCssMapDeviceColorPlan,
  getSpriteCssMapDeviceContentPlan,
  getSpriteCssMapStatusLabel,
} from './spriteCssMap/deviceColorPlan'
import { drawHorizontalCard } from './spriteCssMap/drawHorizontalCard'
import { drawRightLShapeCard } from './spriteCssMap/drawRightLShapeCard'
import { drawVerticalCard } from './spriteCssMap/drawVerticalCard'
import type {
  DrawRect,
  SpriteCssMapDeviceCardDrawOptions,
} from './spriteCssMap/types'

export { drawSpriteCssMapDevicePolygon } from './spriteCssMap/canvasPrimitives'
export {
  createSpriteCssMapDeviceTextureKey,
  formatSpriteCssMapLoadRate,
  getSpriteCssMapDeviceColorPlan,
  getSpriteCssMapDeviceContentPlan,
  getSpriteCssMapStatusLabel,
} from './spriteCssMap/deviceColorPlan'
export type { SpriteCssMapDeviceCardDrawOptions } from './spriteCssMap/types'

export function drawSpriteCssMapDeviceCard(
  canvas: HTMLCanvasElement,
  options: SpriteCssMapDeviceCardDrawOptions,
): void {
  const { layout, theme, selectMode } = options
  const context = canvas.getContext('2d')
  if (!context) return

  canvas.width = layout.pixelWidth
  canvas.height = layout.pixelHeight
  context.setTransform(layout.pixelRatio, 0, 0, layout.pixelRatio, 0, 0)
  context.clearRect(0, 0, layout.logicalWidth, layout.logicalHeight)

  const width = layout.logicalWidth
  const height = layout.logicalHeight
  const minSide = Math.min(width, height)
  const borderWidth = clamp(minSide * 0.035, 2, 6)
  const radius = clamp(minSide * 0.055, 4, 8)
  const colorPlan = getSpriteCssMapDeviceColorPlan(options.device, options.display, theme)

  context.save()
  traceDeviceShape(
    context,
    options.device,
    width,
    height,
    borderWidth / 2,
    radius,
  )
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.fill()
  context.restore()

  const inset = borderWidth
  const contentRect: DrawRect = {
    x: inset,
    y: inset,
    w: Math.max(1, width - inset * 2),
    h: Math.max(1, height - inset * 2),
  }
  const contentPlan = getSpriteCssMapDeviceContentPlan(
    options.device,
    options.display,
    contentRect.w,
    contentRect.h,
  )
  const informationRect: DrawRect = {
    x: contentRect.x,
    y: contentRect.y,
    w: contentPlan.contentWidth,
    h: contentRect.h,
  }

  context.save()
  traceDeviceShape(context, options.device, width, height, borderWidth, radius)
  context.clip()
  const usedRightLShapeLayout = (
    options.device.contentLayout === 'right-l-shape' &&
    drawRightLShapeCard(context, options, contentRect, colorPlan)
  )
  if (!usedRightLShapeLayout && contentPlan.orientation === 'vertical') {
    drawVerticalCard(context, options, informationRect, colorPlan)
  } else if (!usedRightLShapeLayout) {
    drawHorizontalCard(context, options, informationRect, colorPlan)
  }
  context.restore()

  context.save()
  traceDeviceShape(
    context,
    options.device,
    width,
    height,
    borderWidth / 2,
    radius,
  )
  context.lineWidth = borderWidth
  context.strokeStyle = colorPlan.statusBorder
  context.stroke()

  if (selectMode) {
    traceDeviceShape(
      context,
      options.device,
      width,
      height,
      borderWidth + 2,
      radius,
    )
    context.lineWidth = Math.max(2, borderWidth * 0.72)
    context.strokeStyle = 'rgba(36, 113, 255, 0.5)'
    context.stroke()
  }
  context.restore()
}
