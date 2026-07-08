export type SpriteCssMapDeviceCardMode = 'wide' | 'stack' | 'micro'

export type SpriteCssMapDeviceNameMode = 'full' | 'ellipsis'

export type SpriteCssMapZoomBucket = 'far' | 'mid' | 'near' | 'detail'

export interface SpriteCssMapDeviceCardMetrics {
  readonly worldWidth: number
  readonly worldHeight: number
  readonly screenWidth: number
  readonly screenHeight: number
  readonly pixelRatio: number
}

export interface SpriteCssMapDeviceCardLayout {
  readonly mode: SpriteCssMapDeviceCardMode
  readonly nameMode: SpriteCssMapDeviceNameMode
  readonly zoomBucket: SpriteCssMapZoomBucket
  readonly logicalWidth: number
  readonly logicalHeight: number
  readonly pixelWidth: number
  readonly pixelHeight: number
  readonly pixelRatio: number
  readonly cacheBucket: string
}

const minimumReadableSide = 76
const maximumTextureLongSide = 640
const maximumPixelRatio = 2

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function roundToEven(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2)
}

export function getSpriteCssMapZoomBucket(screenScale: number): SpriteCssMapZoomBucket {
  if (screenScale >= 1.85) return 'detail'
  if (screenScale >= 1.18) return 'near'
  if (screenScale >= 0.72) return 'mid'
  return 'far'
}

function getTextureScale(bucket: SpriteCssMapZoomBucket): number {
  switch (bucket) {
    case 'detail':
      return 4
    case 'near':
      return 3
    case 'mid':
      return 2.35
    case 'far':
    default:
      return 1.75
  }
}

function getCardMode(width: number, height: number): SpriteCssMapDeviceCardMode {
  if (width < 86 || height < 52) return 'micro'
  if (width / Math.max(height, 1) < 0.82) return 'stack'
  return 'wide'
}

function shouldShowFullName(
  bucket: SpriteCssMapZoomBucket,
  screenWidth: number,
  screenHeight: number,
): boolean {
  if (bucket === 'detail') return screenWidth >= 58 && screenHeight >= 38
  if (bucket === 'near') return screenWidth >= 112 && screenHeight >= 58
  return screenWidth >= 220 && screenHeight >= 86
}

export function planSpriteCssMapDeviceCard(
  metrics: SpriteCssMapDeviceCardMetrics,
): SpriteCssMapDeviceCardLayout {
  const worldWidth = Math.max(metrics.worldWidth, 1)
  const worldHeight = Math.max(metrics.worldHeight, 1)
  const screenScale = Math.max(
    metrics.screenWidth / worldWidth,
    metrics.screenHeight / worldHeight,
    0.001,
  )
  const zoomBucket = getSpriteCssMapZoomBucket(screenScale)
  const longWorldSide = Math.max(worldWidth, worldHeight)
  const minScale = minimumReadableSide / Math.min(worldWidth, worldHeight)
  const maxScale = maximumTextureLongSide / longWorldSide
  const textureScale = clamp(
    Math.max(getTextureScale(zoomBucket), minScale),
    1,
    Math.max(1, maxScale),
  )
  const logicalWidth = roundToEven(worldWidth * textureScale)
  const logicalHeight = roundToEven(worldHeight * textureScale)
  const pixelRatio = clamp(metrics.pixelRatio, 1, maximumPixelRatio)
  const mode = getCardMode(logicalWidth, logicalHeight)
  const nameMode = shouldShowFullName(zoomBucket, metrics.screenWidth, metrics.screenHeight)
    ? 'full'
    : 'ellipsis'

  return {
    mode,
    nameMode,
    zoomBucket,
    logicalWidth,
    logicalHeight,
    pixelWidth: roundToEven(logicalWidth * pixelRatio),
    pixelHeight: roundToEven(logicalHeight * pixelRatio),
    pixelRatio,
    cacheBucket: `${mode}:${nameMode}:${zoomBucket}:${logicalWidth}x${logicalHeight}:dpr${pixelRatio}`,
  }
}
