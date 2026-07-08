import {
  getCssMapLoadRateBackground,
  getCssMapTitleStyle,
} from './css3dMapPalette'
import type {
  CssMapDevice,
  CssMapDeviceRuntime,
  CssMapDeviceStatus,
  CssMapDisplayOptions,
} from './css3dMapTypes'
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
  return [
    device.id,
    layout.cacheBucket,
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
  context.font = createFont(900, fontSize)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(ellipsizeText(context, text, rect.w - 8), rect.x + rect.w / 2, rect.y + rect.h / 2)
}

function drawHeader(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const { device, layout, theme } = options
  const nameFontSize = clamp(rect.h * 0.34, 9, 22)
  const statusFontSize = clamp(rect.h * 0.26, 8, 15)
  const statusLabel = getSpriteCssMapStatusLabel(device.runtime.status)
  const gap = clamp(rect.w * 0.03, 3, 8)
  const statusWidth = layout.mode === 'stack'
    ? Math.min(rect.w - 8, Math.max(36, rect.w * 0.62))
    : Math.min(rect.w * 0.44, Math.max(44, statusLabel.length * statusFontSize + 14))
  const statusHeight = clamp(rect.h * 0.38, 14, 24)

  context.save()
  context.fillStyle = colorPlan.statusBackground
  context.fillRect(rect.x, rect.y, rect.w, rect.h)
  context.fillStyle = colorPlan.statusColor
  context.font = createFont(900, nameFontSize)
  context.textAlign = 'left'
  context.textBaseline = 'top'

  if (layout.mode === 'stack') {
    const nameMaxWidth = rect.w - 8
    const lines = layout.nameMode === 'full'
      ? splitTextToLines(context, device.name, nameMaxWidth, rect.h >= 40 ? 2 : 1)
      : [ellipsizeText(context, device.name, nameMaxWidth)]
    drawTextLines(context, lines, rect.x + 4, rect.y + 3, nameFontSize * 1.04)
    drawStatusPill(
      context,
      statusLabel,
      {
        x: rect.x + 4,
        y: rect.y + rect.h - statusHeight - 3,
        w: statusWidth,
        h: statusHeight,
      },
      colorPlan,
      statusFontSize,
    )
    context.restore()
    return
  }

  const pillRect: DrawRect = {
    x: rect.x + rect.w - statusWidth - gap,
    y: rect.y + Math.max(2, (rect.h - statusHeight) / 2),
    w: statusWidth,
    h: statusHeight,
  }
  const nameMaxWidth = Math.max(1, pillRect.x - rect.x - gap - 6)
  const nameLines = layout.nameMode === 'full'
    ? splitTextToLines(context, device.name, nameMaxWidth, rect.h >= 34 ? 2 : 1)
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

function drawMarkerRow(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  type: 'staff' | 'fiveM',
): void {
  const { device, display, theme } = options
  const staffItems = display.showStaffing ? device.runtime.staff : []
  const fiveMItems = display.showFiveMChanges ? device.runtime.fiveMChanges : []
  const itemCount = type === 'staff' ? staffItems.length : fiveMItems.length
  const label = type === 'staff' ? '配置' : '5M'
  const labelWidth = clamp(rect.w * 0.22, 18, 34)
  const gap = clamp(rect.h * 0.1, 2, 5)
  const markerSize = Math.floor(clamp(rect.h - 5, 7, type === 'staff' ? 18 : 19))
  const markerAreaWidth = Math.max(0, rect.w - labelWidth - gap)
  const markerStep = markerSize + gap
  const visibleCount = markerStep > 0
    ? Math.max(0, Math.floor((markerAreaWidth + gap) / markerStep))
    : 0
  const drawCount = Math.min(itemCount, visibleCount)

  context.save()
  context.fillStyle = 'rgba(20, 33, 61, 0.72)'
  context.font = createFont(800, clamp(rect.h * 0.34, 7, 12))
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(label, rect.x, rect.y + rect.h / 2, labelWidth)

  if (itemCount === 0 || drawCount === 0) {
    context.fillStyle = 'rgba(20, 33, 61, 0.38)'
    context.font = createFont(900, clamp(rect.h * 0.36, 7, 12))
    context.fillText('--', rect.x + labelWidth + gap, rect.y + rect.h / 2, markerAreaWidth)
    context.restore()
    return
  }

  let markerX = rect.x + labelWidth + gap
  const markerY = rect.y + (rect.h - markerSize) / 2
  for (let index = 0; index < drawCount; index += 1) {
    if (type === 'staff') {
      drawSpriteCssMapStaffMarker(context, staffItems[index], markerX, markerY, markerSize)
    } else {
      drawSpriteCssMapFiveMMarker(context, fiveMItems[index], markerX, markerY, markerSize)
    }
    markerX += markerStep
  }

  if (drawCount < itemCount && markerX + markerSize * 0.9 <= rect.x + rect.w) {
    drawMarkerOverflowText(context, `+${itemCount - drawCount}`, markerX, markerY, markerSize)
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

  drawMarkerRow(context, options, {
    x: detailX + 5,
    y: rect.y + 2,
    w: Math.max(1, rect.w - rateWidth - 9),
    h: Math.max(1, rowHeight - 3),
  }, 'staff')
  drawMarkerRow(context, options, {
    x: detailX + 5,
    y: rect.y + rowHeight,
    w: Math.max(1, rect.w - rateWidth - 9),
    h: Math.max(1, rowHeight - 3),
  }, 'fiveM')
}

function drawStackBody(
  context: CanvasRenderingContext2D,
  options: SpriteCssMapDeviceCardDrawOptions,
  rect: DrawRect,
  colorPlan: SpriteCssMapDeviceColorPlan,
): void {
  const rateHeight = clamp(rect.h * 0.32, 18, 34)
  const rowHeight = Math.max(12, (rect.h - rateHeight) / 2)

  drawLoadRate(context, options.device, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rateHeight,
  }, colorPlan)
  drawMarkerRow(context, options, {
    x: rect.x + 4,
    y: rect.y + rateHeight + 1,
    w: rect.w - 8,
    h: rowHeight - 1,
  }, 'staff')
  drawMarkerRow(context, options, {
    x: rect.x + 4,
    y: rect.y + rateHeight + rowHeight,
    w: rect.w - 8,
    h: rowHeight - 1,
  }, 'fiveM')
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
  roundedRect(context, borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth, radius)
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.fill()
  context.lineWidth = borderWidth
  context.strokeStyle = colorPlan.statusBorder
  context.stroke()

  if (selectMode) {
    roundedRect(context, borderWidth + 2, borderWidth + 2, width - borderWidth * 2 - 4, height - borderWidth * 2 - 4, radius)
    context.lineWidth = Math.max(2, borderWidth * 0.72)
    context.strokeStyle = 'rgba(36, 113, 255, 0.5)'
    context.stroke()
  }
  context.restore()

  const inset = borderWidth
  const headerHeight = layout.mode === 'stack'
    ? clamp(height * 0.34, 30, 68)
    : clamp(height * 0.36, 22, 52)
  const contentRect: DrawRect = {
    x: inset,
    y: inset,
    w: Math.max(1, width - inset * 2),
    h: Math.max(1, height - inset * 2),
  }
  const headerRect: DrawRect = {
    x: contentRect.x,
    y: contentRect.y,
    w: contentRect.w,
    h: Math.min(headerHeight, contentRect.h * 0.62),
  }
  const bodyRect: DrawRect = {
    x: contentRect.x,
    y: headerRect.y + headerRect.h,
    w: contentRect.w,
    h: Math.max(1, contentRect.h - headerRect.h),
  }

  drawHeader(context, options, headerRect, colorPlan)

  if (layout.mode === 'stack' || layout.mode === 'micro') {
    drawStackBody(context, options, bodyRect, colorPlan)
  } else {
    drawWideBody(context, options, bodyRect, colorPlan)
  }
}
