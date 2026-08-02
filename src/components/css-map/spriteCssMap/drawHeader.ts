import { getSpriteCssMapStatusLabel } from './deviceColorPlan'
import { clamp, createFont, ellipsizeText, fitSingleLineFontSize, splitTextToLines, drawTextLines, fitTextBlock } from './canvasText'
import { roundedRect } from './canvasPrimitives'
import type { DrawRect, SpriteCssMapDeviceColorPlan, SpriteCssMapDeviceCardDrawOptions } from './types'

export function drawStatusPill(
  context: CanvasRenderingContext2D,
  text: string,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
  fontSize: number,
): void {
  if (rect.w <= 12 || rect.h <= 10) return

  roundedRect(context, rect.x, rect.y, rect.w, rect.h, rect.h / 2)
  context.fillStyle = colorPlan.statusBorder
  context.fill()
  context.fillStyle = '#ffffff'
  const innerWidth = Math.max(1, rect.w - 8)
  const fittedFontSize = fitSingleLineFontSize(context, text, innerWidth, fontSize, 8)
  context.font = createFont(900, fittedFontSize)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(ellipsizeText(context, text, innerWidth), rect.x + rect.w / 2, rect.y + rect.h / 2)
}

export function drawHorizontalHeader(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const { device, layout } = options
  const statusLabel = getSpriteCssMapStatusLabel(device.runtime.status)
  const gap = clamp(rect.w * 0.03, 3, 8)
  const statusWidth = Math.min(
    rect.w * 0.44,
    Math.max(44, statusLabel.length * clamp(rect.h * 0.26, 8, 15) + 14),
  )
  const statusHeight = clamp(rect.h * 0.38, 14, 24)
  const statusFontSize = clamp(rect.h * 0.26, 8, 15)

  context.save()
  context.fillStyle = colorPlan.statusBackground
  context.fillRect(rect.x, rect.y, rect.w, rect.h)
  context.fillStyle = colorPlan.statusColor
  context.textAlign = 'left'
  context.textBaseline = 'top'

  const nameFontSize = clamp(rect.h * 0.34, 9, 22)
  context.font = createFont(900, nameFontSize)

  const pillRect: DrawRect = {
    x: rect.x + rect.w - statusWidth - gap,
    y: rect.y + Math.max(2, (rect.h - statusHeight) / 2),
    w: statusWidth,
    h: statusHeight,
  }
  const nameMaxWidth = Math.max(1, pillRect.x - rect.x - gap - 6)
  const nameLines = layout.nameMode === 'full'
    ? splitTextToLines(context, device.name, nameMaxWidth, 2)
    : [ellipsizeText(context, device.name, nameMaxWidth)]
  const textBlockHeight = nameLines.length * nameFontSize * 1.02

  drawTextLines(
    context,
    nameLines,
    rect.x + 6,
    rect.y + Math.max(3, (rect.h - textBlockHeight) / 2),
    nameFontSize * 1.02,
  )
  drawStatusPill(context, statusLabel, pillRect, colorPlan, statusFontSize)
  context.restore()
}

export function drawVerticalHeader(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  nameRect: DrawRect,
  statusRect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const { device, layout } = options
  const statusLabel = getSpriteCssMapStatusLabel(device.runtime.status)
  const nameMaxWidth = Math.max(1, nameRect.w - 8)
  const preferredNameFontSize = clamp(
    Math.min(nameRect.w * 0.22, nameRect.h * 0.34),
    9,
    20,
  )

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.fillRect(nameRect.x, nameRect.y, nameRect.w, nameRect.h)
  context.fillStyle = '#14213d'
  context.textAlign = 'center'
  context.textBaseline = 'top'

  const nameBlock = layout.nameMode === 'full'
    ? fitTextBlock(
        context,
        device.name,
        nameMaxWidth,
        Math.max(1, nameRect.h - 6),
        3,
        preferredNameFontSize,
        8,
      )
    : {
        fontSize: preferredNameFontSize,
        lines: [ellipsizeText(context, device.name, nameMaxWidth)],
        lineHeight: preferredNameFontSize * 1.04,
      }
  const nameBlockHeight = nameBlock.lines.length * nameBlock.lineHeight
  context.font = createFont(900, nameBlock.fontSize)
  drawTextLines(
    context,
    nameBlock.lines,
    nameRect.x + nameRect.w / 2,
    nameRect.y + Math.max(3, (nameRect.h - nameBlockHeight) / 2),
    nameBlock.lineHeight,
  )

  context.fillStyle = colorPlan.statusBackground
  context.fillRect(statusRect.x, statusRect.y, statusRect.w, statusRect.h)
  context.fillStyle = colorPlan.statusColor
  const statusFontSize = fitSingleLineFontSize(
    context,
    statusLabel,
    Math.max(1, statusRect.w - 8),
    clamp(statusRect.h * 0.52, 9, 18),
    8,
  )
  context.font = createFont(900, statusFontSize)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    ellipsizeText(context, statusLabel, Math.max(1, statusRect.w - 8)),
    statusRect.x + statusRect.w / 2,
    statusRect.y + statusRect.h / 2,
  )
  context.restore()
}
