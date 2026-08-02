import { clamp, createFont } from './canvasText'
import { drawSpriteCssMapFiveMMarker } from '../spriteCssMapFiveMMarker'
import { drawSpriteCssMapStaffMarker } from '../spriteCssMapStaffMarker'
import { planCssMapMarkerSlots } from '../cssMapDeviceContentLayout'
import type { DrawRect, RenderableMarkerSlots, SpriteCssMapDeviceCardDrawOptions } from './types'

export function drawMarkerOverflowText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
): void {
  context.save()
  context.fillStyle = 'rgba(20, 33, 61, 0.66)'
  context.font = createFont(900, Math.max(7, size * 0.52))
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(text, x, y + size / 2)
  context.restore()
}

export function getRenderableMarkerSlots(
  itemCount: number,
  capacity: number,
): RenderableMarkerSlots {
  const normalizedCapacity = Math.max(0, Math.floor(capacity))
  if (itemCount <= normalizedCapacity) {
    return {
      visibleMarkerCount: itemCount,
      overflowCount: 0,
      occupiedSlots: itemCount,
    }
  }

  const visibleMarkerCount = Math.max(0, normalizedCapacity - 1)
  return {
    visibleMarkerCount,
    overflowCount: itemCount - visibleMarkerCount,
    occupiedSlots: normalizedCapacity,
  }
}

export function drawMarkerItem(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  type: 'staff' | 'fiveM',
  index: number,
  x: number,
  y: number,
  size: number,
): void {
  if (type === 'staff') {
    drawSpriteCssMapStaffMarker(
      context,
      options.device.runtime.staff[index],
      x,
      y,
      size,
    )
    return
  }

  drawSpriteCssMapFiveMMarker(
    context,
    options.device.runtime.fiveMChanges[index],
    x,
    y,
    size,
    options.theme,
  )
}

export function drawMarkerLabel(
  context: CanvasRenderingContext2D,
  label: string,
  rect: DrawRect,
  fontSize: number,
): void {
  context.fillStyle = 'rgba(20, 33, 61, 0.72)'
  context.font = createFont(800, fontSize)
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(label, rect.x, rect.y + rect.h / 2, rect.w)
}

export function drawEmptyMarkerValue(
  context: CanvasRenderingContext2D,
  rect: DrawRect,
  fontSize: number,
): void {
  context.fillStyle = 'rgba(20, 33, 61, 0.38)'
  context.font = createFont(900, fontSize)
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText('--', rect.x, rect.y + rect.h / 2, rect.w)
}

export function getMarkerItemCount(
  options: SpriteCssMapDeviceCardDrawOptions,
  type: 'staff' | 'fiveM',
): number {
  if (type === 'staff') {
    return options.display.showStaffing ? options.device.runtime.staff.length : 0
  }
  return options.display.showFiveMChanges ? options.device.runtime.fiveMChanges.length : 0
}

export function drawHorizontalMarkerRow(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  type: 'staff' | 'fiveM',
): void {
  const itemCount = getMarkerItemCount(options, type)
  const label = type === 'staff' ? '人员' : '5M'
  const labelWidth = clamp(rect.w * 0.22, 18, 34)
  const gap = clamp(rect.h * 0.1, 2, 5)
  const markerAreaWidth = Math.max(0, rect.w - labelWidth - gap)
  const maximumMarkerSize = type === 'staff' ? 18 : 19
  const minimumMarkerSize = 7
  const fixedPlan = planCssMapMarkerSlots(itemCount, 'horizontal')
  const geometricCapacity = Math.max(
    0,
    Math.floor((markerAreaWidth + gap) / (minimumMarkerSize + gap)),
  )
  const slots = getRenderableMarkerSlots(
    itemCount,
    Math.min(fixedPlan.capacity, geometricCapacity),
  )
  const markerSize = slots.occupiedSlots > 0
    ? Math.floor(clamp(
        (markerAreaWidth - Math.max(0, slots.occupiedSlots - 1) * gap) / slots.occupiedSlots,
        5,
        Math.min(maximumMarkerSize, Math.max(5, rect.h - 5)),
      ))
    : minimumMarkerSize

  context.save()
  drawMarkerLabel(
    context,
    label,
    { x: rect.x, y: rect.y, w: labelWidth, h: rect.h },
    clamp(rect.h * 0.34, 7, 12),
  )

  const markerAreaRect: DrawRect = {
    x: rect.x + labelWidth + gap,
    y: rect.y,
    w: markerAreaWidth,
    h: rect.h,
  }
  if (itemCount === 0) {
    drawEmptyMarkerValue(context, markerAreaRect, clamp(rect.h * 0.36, 7, 12))
    context.restore()
    return
  }

  if (slots.occupiedSlots === 0) {
    drawMarkerOverflowText(
      context,
      `+${itemCount}`,
      markerAreaRect.x,
      markerAreaRect.y + (markerAreaRect.h - minimumMarkerSize) / 2,
      minimumMarkerSize,
    )
    context.restore()
    return
  }

  let markerX = markerAreaRect.x
  const markerY = markerAreaRect.y + (markerAreaRect.h - markerSize) / 2
  for (let index = 0; index < slots.visibleMarkerCount; index += 1) {
    drawMarkerItem(context, options, type, index, markerX, markerY, markerSize)
    markerX += markerSize + gap
  }

  if (slots.overflowCount > 0) {
    drawMarkerOverflowText(context, `+${slots.overflowCount}`, markerX, markerY, markerSize)
  }
  context.restore()
}

export function drawVerticalMarkerGrid(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  type: 'staff' | 'fiveM',
): void {
  const itemCount = getMarkerItemCount(options, type)
  const label = type === 'staff' ? '人员' : '5M'
  const labelWidth = clamp(rect.w * 0.28, 16, 30)
  const gap = clamp(Math.min(rect.w, rect.h) * 0.045, 2, 4)
  const markerAreaWidth = Math.max(0, rect.w - labelWidth - gap)
  const markerAreaHeight = Math.max(0, rect.h - 4)
  const minimumMarkerSize = 7
  const fixedPlan = planCssMapMarkerSlots(itemCount, 'vertical')
  const geometricColumns = Math.min(
    3,
    Math.max(0, Math.floor((markerAreaWidth + gap) / (minimumMarkerSize + gap))),
  )
  const geometricRows = Math.min(
    2,
    Math.max(0, Math.floor((markerAreaHeight + gap) / (minimumMarkerSize + gap))),
  )
  const slots = getRenderableMarkerSlots(
    itemCount,
    Math.min(fixedPlan.capacity, geometricColumns * geometricRows),
  )
  const columns = Math.min(3, Math.max(1, slots.occupiedSlots))
  const rows = slots.occupiedSlots === 0
    ? 0
    : Math.ceil(slots.occupiedSlots / columns)
  const maximumMarkerSize = type === 'staff' ? 15 : 16
  const markerSize = slots.occupiedSlots > 0
    ? Math.floor(clamp(
        Math.min(
          (markerAreaWidth - Math.max(0, columns - 1) * gap) / columns,
          (markerAreaHeight - Math.max(0, rows - 1) * gap) / Math.max(rows, 1),
        ),
        5,
        maximumMarkerSize,
      ))
    : minimumMarkerSize

  context.save()
  drawMarkerLabel(
    context,
    label,
    { x: rect.x, y: rect.y, w: labelWidth, h: rect.h },
    clamp(rect.h * 0.15, 7, 11),
  )
  const markerAreaRect: DrawRect = {
    x: rect.x + labelWidth + gap,
    y: rect.y + 2,
    w: markerAreaWidth,
    h: markerAreaHeight,
  }
  if (itemCount === 0) {
    drawEmptyMarkerValue(context, markerAreaRect, clamp(rect.h * 0.18, 7, 11))
    context.restore()
    return
  }

  if (slots.occupiedSlots === 0) {
    drawMarkerOverflowText(
      context,
      `+${itemCount}`,
      markerAreaRect.x,
      markerAreaRect.y + (markerAreaRect.h - minimumMarkerSize) / 2,
      minimumMarkerSize,
    )
    context.restore()
    return
  }

  const slotCount = slots.visibleMarkerCount + (slots.overflowCount > 0 ? 1 : 0)
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const column = slotIndex % columns
    const row = Math.floor(slotIndex / columns)
    const markerX = markerAreaRect.x + column * (markerSize + gap)
    const markerY = markerAreaRect.y + row * (markerSize + gap)

    if (slotIndex < slots.visibleMarkerCount) {
      drawMarkerItem(context, options, type, slotIndex, markerX, markerY, markerSize)
    } else {
      drawMarkerOverflowText(
        context,
        `+${slots.overflowCount}`,
        markerX,
        markerY,
        markerSize,
      )
    }
  }
  context.restore()
}
