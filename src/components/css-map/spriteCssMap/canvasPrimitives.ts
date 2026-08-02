import type { CssMapDevice, CssMapPoint } from '../css3dMapTypes'
import { isValidCssMapDevicePolygon } from '../cssMapDeviceShape'

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

export function drawSpriteCssMapDevicePolygon(
  context: CanvasRenderingContext2D,
  polygon: readonly CssMapPoint[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  inset = 0,
): void {
  const drawableWidth = Math.max(0, targetWidth - inset * 2)
  const drawableHeight = Math.max(0, targetHeight - inset * 2)

  context.beginPath()
  polygon.forEach((point, index) => {
    const x = inset + (point.x / sourceWidth) * drawableWidth
    const y = inset + (point.y / sourceHeight) * drawableHeight

    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  })
  context.closePath()
}

export function traceDeviceShape(
  context: CanvasRenderingContext2D,
  device: CssMapDevice,
  width: number,
  height: number,
  inset: number,
  radius: number,
): void {
  if (isValidCssMapDevicePolygon(device.polygon, device.w, device.h)) {
    drawSpriteCssMapDevicePolygon(
      context,
      device.polygon,
      device.w,
      device.h,
      width,
      height,
      inset,
    )
    return
  }

  roundedRect(
    context,
    inset,
    inset,
    Math.max(0, width - inset * 2),
    Math.max(0, height - inset * 2),
    radius,
  )
}
