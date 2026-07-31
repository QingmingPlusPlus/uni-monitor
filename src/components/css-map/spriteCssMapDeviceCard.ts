import {
  getCssMapLoadRateBackground,
  getCssMapTitleStyle,
} from './css3dMapPalette'
import type {
  CssMapDevice,
  CssMapDeviceRuntime,
  CssMapDeviceStatus,
  CssMapDisplayOptions,
  CssMapPoint,
} from './css3dMapTypes'
import {
  getCssMapRightLShapeMetrics,
  isValidCssMapDevicePolygon,
} from './cssMapDeviceShape'
import {
  planCssMapDeviceContent,
  planCssMapMarkerSlots,
  planCssMapRightLShapeContent,
  type CssMapDeviceContentPlan,
} from './cssMapDeviceContentLayout'
import { drawSpriteCssMapFiveMMarker } from './spriteCssMapFiveMMarker'
import { drawSpriteCssMapStaffMarker } from './spriteCssMapStaffMarker'
import {
  resolveSpriteCssMapColorToken,
  type SpriteCssMapCanvasTheme,
} from './spriteCssMapTheme'
import type { SpriteCssMapDeviceCardLayout } from './spriteCssMapDeviceLayout'

export const spriteCssMapStatusLabels: Readonly<Record<CssMapDeviceStatus, string>> = {
  production: '生产中',
  abnormalStop: '异常停止',
  plannedStop: '计划停止',
  changeover: '切替',
  cleaning: '清扫',
  neutral: '待确认',
}

interface SpriteCssMapDeviceColorPlan {
  readonly statusBackground: string
  readonly statusBorder: string
  readonly statusColor: string
  readonly loadRateBackground: string
}

export interface SpriteCssMapDeviceCardDrawOptions {
  readonly device: CssMapDevice
  readonly display: CssMapDisplayOptions
  readonly layout: SpriteCssMapDeviceCardLayout
  readonly selectMode: boolean
  readonly theme: SpriteCssMapCanvasTheme
}

interface DrawRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function createFont(weight: number, size: number): string {
  return `${weight} ${Math.max(6, Math.round(size))}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
}

function createRuntimeKey(runtime: CssMapDeviceRuntime): string {
  return [
    runtime.status ?? 'null',
    runtime.loadRate === null ? 'null' : runtime.loadRate.toFixed(1),
    runtime.staff.map((staff) => `${staff.id}:${staff.shift}:${staff.category}`).join(','),
    runtime.fiveMChanges.map((change) => `${change.id}:${change.category}:${change.label}`).join(','),
  ].join('|')
}

export function createSpriteCssMapDeviceTextureKey(
  device: CssMapDevice,
  display: CssMapDisplayOptions,
  layout: SpriteCssMapDeviceCardLayout,
  selectMode: boolean,
): string {
  const contentPlan = getSpriteCssMapDeviceContentPlan(
    device,
    display,
    layout.logicalWidth,
    layout.logicalHeight,
  )

  return [
    device.id,
    device.polygon?.map((point) => `${point.x},${point.y}`).join(';') ?? 'rectangle',
    device.contentLayout ?? 'standard-layout',
    layout.cacheBucket,
    contentPlan.cacheKey,
    selectMode ? 'select' : 'normal',
    display.showStatusColor ? 'status-on' : 'status-off',
    display.showLoadRateColor ? 'load-on' : 'load-off',
    display.showStaffing ? 'staff-on' : 'staff-off',
    display.showFiveMChanges ? '5m-on' : '5m-off',
    createRuntimeKey(device.runtime),
  ].join('::')
}

export function formatSpriteCssMapLoadRate(value: number | null): string {
  return value === null ? '--' : `${value.toFixed(1)}%`
}

export function getSpriteCssMapStatusLabel(status: CssMapDeviceStatus | null): string {
  return status === null ? '待确认' : spriteCssMapStatusLabels[status]
}

export function getSpriteCssMapDeviceContentPlan(
  device: CssMapDevice,
  display: CssMapDisplayOptions,
  surfaceWidth: number,
  surfaceHeight: number,
): CssMapDeviceContentPlan {
  return planCssMapDeviceContent({
    worldWidth: device.w,
    worldHeight: device.h,
    surfaceWidth,
    surfaceHeight,
    name: device.name,
    statusLabel: getSpriteCssMapStatusLabel(device.runtime.status),
    loadRateLabel: formatSpriteCssMapLoadRate(device.runtime.loadRate),
    staffCount: display.showStaffing ? device.runtime.staff.length : 0,
    fiveMCount: display.showFiveMChanges ? device.runtime.fiveMChanges.length : 0,
    showStaffing: display.showStaffing,
    showFiveMChanges: display.showFiveMChanges,
  })
}

export function getSpriteCssMapDeviceColorPlan(
  device: CssMapDevice,
  display: CssMapDisplayOptions,
  theme: SpriteCssMapCanvasTheme,
): SpriteCssMapDeviceColorPlan {
  const status = getCssMapTitleStyle(device.runtime.status, display.showStatusColor)

  return {
    statusBackground: resolveSpriteCssMapColorToken(status.background, theme),
    statusBorder: resolveSpriteCssMapColorToken(status.border, theme),
    statusColor: resolveSpriteCssMapColorToken(status.color, theme),
    loadRateBackground: resolveSpriteCssMapColorToken(
      getCssMapLoadRateBackground(device.runtime.loadRate, display.showLoadRateColor),
      theme,
    ),
  }
}

function roundedRect(
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

function traceDeviceShape(
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

function ellipsizeText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) return text
  const ellipsis = '...'
  let start = 0
  let end = text.length

  while (start < end) {
    const mid = Math.ceil((start + end) / 2)
    const candidate = `${text.slice(0, mid)}${ellipsis}`
    if (context.measureText(candidate).width <= maxWidth) {
      start = mid
    } else {
      end = mid - 1
    }
  }

  return start <= 0 ? ellipsis : `${text.slice(0, start)}${ellipsis}`
}

function splitTextToLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const chars = Array.from(text)
  const lines: string[] = []
  let current = ''

  for (const char of chars) {
    const candidate = `${current}${char}`
    if (context.measureText(candidate).width <= maxWidth || current.length === 0) {
      current = candidate
      continue
    }

    lines.push(current)
    current = char
    if (lines.length >= maxLines) break
  }

  if (lines.length < maxLines && current) {
    lines.push(current)
  }

  if (lines.length > 0 && context.measureText(lines[lines.length - 1]).width > maxWidth) {
    lines[lines.length - 1] = ellipsizeText(context, lines[lines.length - 1], maxWidth)
  }

  if (lines.length === maxLines && lines.join('').length < text.length) {
    lines[maxLines - 1] = ellipsizeText(context, lines[maxLines - 1], maxWidth)
  }

  return lines.length === 0 ? [''] : lines
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
): void {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight)
  })
}

interface FittedTextBlock {
  readonly fontSize: number
  readonly lines: readonly string[]
  readonly lineHeight: number
}

function wrapTextToLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let current = ''

  Array.from(text).forEach((char) => {
    const candidate = `${current}${char}`
    if (current.length === 0 || context.measureText(candidate).width <= maxWidth) {
      current = candidate
      return
    }

    lines.push(current)
    current = char
  })

  if (current) lines.push(current)
  return lines.length === 0 ? [''] : lines
}

function fitTextBlock(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxLines: number,
  preferredFontSize: number,
  minimumFontSize: number,
): FittedTextBlock {
  for (let fontSize = preferredFontSize; fontSize >= minimumFontSize; fontSize -= 0.5) {
    context.font = createFont(900, fontSize)
    const lines = wrapTextToLines(context, text, maxWidth)
    const lineHeight = fontSize * 1.04
    if (lines.length <= maxLines && lines.length * lineHeight <= maxHeight) {
      return { fontSize, lines, lineHeight }
    }
  }

  context.font = createFont(900, minimumFontSize)
  return {
    fontSize: minimumFontSize,
    lines: splitTextToLines(context, text, maxWidth, maxLines),
    lineHeight: minimumFontSize * 1.04,
  }
}

function fitSingleLineFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  preferredFontSize: number,
  minimumFontSize: number,
): number {
  for (let fontSize = preferredFontSize; fontSize >= minimumFontSize; fontSize -= 0.5) {
    context.font = createFont(900, fontSize)
    if (context.measureText(text).width <= maxWidth) return fontSize
  }
  return minimumFontSize
}

function drawStatusPill(
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

function drawHorizontalHeader(
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

function drawVerticalHeader(
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
  context.font = createFont(900, preferredNameFontSize)

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

function drawLoadRate(
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

function drawVerticalLoadRate(
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

function drawMarkerOverflowText(
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

interface RenderableMarkerSlots {
  readonly visibleMarkerCount: number
  readonly overflowCount: number
  readonly occupiedSlots: number
}

function getRenderableMarkerSlots(
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

function drawMarkerItem(
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

function drawMarkerLabel(
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

function drawEmptyMarkerValue(
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

function getMarkerItemCount(
  options: SpriteCssMapDeviceCardDrawOptions,
  type: 'staff' | 'fiveM',
): number {
  if (type === 'staff') {
    return options.display.showStaffing ? options.device.runtime.staff.length : 0
  }
  return options.display.showFiveMChanges ? options.device.runtime.fiveMChanges.length : 0
}

function drawHorizontalMarkerRow(
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

function drawVerticalMarkerGrid(
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

function drawHorizontalCard(
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

function drawRightLShapeCard(
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

function drawVerticalCard(
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
