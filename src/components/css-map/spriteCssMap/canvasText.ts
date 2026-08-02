import type { FittedTextBlock } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function createFont(weight: number, size: number): string {
  return `${weight} ${Math.max(6, Math.round(size))}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
}

export function ellipsizeText(
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

export function splitTextToLines(
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

export function drawTextLines(
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

export function wrapTextToLines(
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

export function fitTextBlock(
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

export function fitSingleLineFontSize(
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
