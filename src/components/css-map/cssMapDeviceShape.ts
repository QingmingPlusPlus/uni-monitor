import type {
  CssMapDeviceLayout,
  CssMapPoint,
} from './css3dMapTypes'

const MIN_POLYGON_POINTS = 3
const MIN_POLYGON_AREA = 0.0001

export interface CssMapRightLShapeMetrics {
  readonly legStartRatio: number
  readonly barHeightRatio: number
}

function getPolygonArea(points: readonly CssMapPoint[]): number {
  let doubleArea = 0

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]
    doubleArea += point.x * next.y - next.x * point.y
  })

  return Math.abs(doubleArea) / 2
}

function isPointOnSegment(
  x: number,
  y: number,
  start: CssMapPoint,
  end: CssMapPoint,
): boolean {
  const crossProduct = (
    (x - start.x) * (end.y - start.y) -
    (y - start.y) * (end.x - start.x)
  )
  if (Math.abs(crossProduct) > Number.EPSILON * 100) return false

  return (
    x >= Math.min(start.x, end.x) &&
    x <= Math.max(start.x, end.x) &&
    y >= Math.min(start.y, end.y) &&
    y <= Math.max(start.y, end.y)
  )
}

export function isValidCssMapDevicePolygon(
  polygon: readonly CssMapPoint[] | undefined,
  width: number,
  height: number,
): polygon is readonly CssMapPoint[] {
  return Boolean(
    polygon &&
    polygon.length >= MIN_POLYGON_POINTS &&
    width > 0 &&
    height > 0 &&
    polygon.every((point) => (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= width &&
      point.y >= 0 &&
      point.y <= height
    )) &&
    getPolygonArea(polygon) >= MIN_POLYGON_AREA,
  )
}

export function getCssMapDeviceClipPath(
  device: Pick<CssMapDeviceLayout, 'w' | 'h' | 'polygon'>,
): string | undefined {
  if (!isValidCssMapDevicePolygon(device.polygon, device.w, device.h)) return undefined

  const points = device.polygon.map((point) => (
    `${(point.x / device.w) * 100}% ${(point.y / device.h) * 100}%`
  ))

  return `polygon(${points.join(', ')})`
}

export function getCssMapDeviceSvgPolygonPoints(
  device: Pick<CssMapDeviceLayout, 'w' | 'h' | 'polygon'>,
): string | undefined {
  if (!isValidCssMapDevicePolygon(device.polygon, device.w, device.h)) return undefined

  return device.polygon
    .map((point) => `${(point.x / device.w) * 100},${(point.y / device.h) * 100}`)
    .join(' ')
}

export function getCssMapDeviceShapeKey(
  device: Pick<CssMapDeviceLayout, 'w' | 'h' | 'polygon'>,
): string {
  if (!isValidCssMapDevicePolygon(device.polygon, device.w, device.h)) return 'rectangle'

  return device.polygon.map((point) => `${point.x},${point.y}`).join(';')
}

export function getCssMapRightLShapeMetrics(
  device: Pick<CssMapDeviceLayout, 'w' | 'h' | 'polygon'>,
): CssMapRightLShapeMetrics | undefined {
  if (!isValidCssMapDevicePolygon(device.polygon, device.w, device.h)) return undefined

  const tolerance = Math.max(device.w, device.h) * 0.000001
  const bottomXs = device.polygon
    .filter((point) => Math.abs(point.y - device.h) <= tolerance)
    .map((point) => point.x)
  const leftYs = device.polygon
    .filter((point) => Math.abs(point.x) <= tolerance)
    .map((point) => point.y)

  if (bottomXs.length < 2 || leftYs.length < 2) return undefined

  const legStartRatio = Math.min(...bottomXs) / device.w
  const barHeightRatio = Math.max(...leftYs) / device.h
  if (
    legStartRatio <= 0 ||
    legStartRatio >= 1 ||
    barHeightRatio <= 0 ||
    barHeightRatio >= 1
  ) {
    return undefined
  }

  return {
    legStartRatio,
    barHeightRatio,
  }
}

export function isCssMapDevicePointInsideShape(
  device: Pick<CssMapDeviceLayout, 'w' | 'h' | 'polygon'>,
  normalizedX: number,
  normalizedY: number,
): boolean {
  if (
    normalizedX < 0 ||
    normalizedX > 1 ||
    normalizedY < 0 ||
    normalizedY > 1
  ) {
    return false
  }
  if (!isValidCssMapDevicePolygon(device.polygon, device.w, device.h)) return true

  const x = normalizedX * device.w
  const y = normalizedY * device.h
  let inside = false

  for (
    let currentIndex = 0, previousIndex = device.polygon.length - 1;
    currentIndex < device.polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = device.polygon[currentIndex]
    const previous = device.polygon[previousIndex]
    if (isPointOnSegment(x, y, current, previous)) return true

    const crossesHorizontalRay = (current.y > y) !== (previous.y > y)
    if (!crossesHorizontalRay) continue

    const intersectionX = (
      ((previous.x - current.x) * (y - current.y)) /
      (previous.y - current.y) +
      current.x
    )
    if (x < intersectionX) {
      inside = !inside
    }
  }

  return inside
}

export function createCssMapScaledPolygon(
  polygon: readonly CssMapPoint[] | undefined,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CssMapPoint[] | undefined {
  if (!isValidCssMapDevicePolygon(polygon, sourceWidth, sourceHeight)) return undefined

  return polygon.map((point) => ({
    x: (point.x / sourceWidth) * targetWidth,
    y: (point.y / sourceHeight) * targetHeight,
  }))
}
