import type {
  CssMapDeviceLayout,
  CssMapPoint,
  CssMapProcessBoundary,
  CssMapProcessBoundaryAssignment,
  CssMapProcessValue,
  CssMapRect,
} from './css3dMapTypes'

const GEOMETRY_EPSILON = 0.000001

export function createCssMapProcessBoundaryLookup(boundaries: CssMapProcessBoundary[]) {
  return boundaries.reduce<Partial<Record<CssMapProcessValue, CssMapProcessBoundary[]>>>(
    (result, boundary) => {
      result[boundary.process] = [...(result[boundary.process] ?? []), boundary]
      return result
    },
    {},
  )
}

export function getCssMapProcessBoundaries(
  boundaries: CssMapProcessBoundary[],
  process: CssMapProcessValue,
) {
  return createCssMapProcessBoundaryLookup(boundaries)[process] ?? []
}

export function getCssMapProcessBoundary(
  boundaries: CssMapProcessBoundary[],
  process: CssMapProcessValue,
) {
  return getCssMapProcessBoundaries(boundaries, process)[0] ?? null
}

export function getCssMapProcessBoundaryRect(boundary: CssMapProcessBoundary): CssMapRect {
  const xs = boundary.points.map((point) => point.x)
  const ys = boundary.points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  }
}

function getCssMapProcessBoundaryRectsFocusRect(boundaries: CssMapProcessBoundary[]) {
  const validBoundaries = boundaries.filter((boundary) => boundary.points.length >= 3)
  if (validBoundaries.length === 0) return null

  const rects = validBoundaries.map(getCssMapProcessBoundaryRect)
  const minX = Math.min(...rects.map((rect) => rect.x))
  const minY = Math.min(...rects.map((rect) => rect.y))
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.w))
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.h))

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  }
}

export function getCssMapProcessBoundaryFocusRect(
  boundaries: CssMapProcessBoundary[],
  process: CssMapProcessValue,
) {
  return getCssMapProcessBoundaryRectsFocusRect(getCssMapProcessBoundaries(boundaries, process))
}

export function getCssMapProcessBoundaryGroupFocusRect(
  boundaries: CssMapProcessBoundary[],
  processes: CssMapProcessValue[],
) {
  const processSet = new Set(processes)
  const processBoundaries = boundaries.filter((boundary) => processSet.has(boundary.process))

  return getCssMapProcessBoundaryRectsFocusRect(processBoundaries)
}

function isNearlyEqual(left: number, right: number) {
  return Math.abs(left - right) <= GEOMETRY_EPSILON
}

function getOrientation(a: CssMapPoint, b: CssMapPoint, c: CssMapPoint) {
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

  if (Math.abs(cross) <= GEOMETRY_EPSILON) return 0
  return cross > 0 ? 1 : -1
}

function isPointOnSegment(point: CssMapPoint, start: CssMapPoint, end: CssMapPoint) {
  if (getOrientation(start, end, point) !== 0) return false

  return (
    point.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON &&
    point.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON &&
    point.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON &&
    point.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON
  )
}

function segmentsHaveProperIntersection(
  firstStart: CssMapPoint,
  firstEnd: CssMapPoint,
  secondStart: CssMapPoint,
  secondEnd: CssMapPoint,
) {
  const firstToSecondStart = getOrientation(firstStart, firstEnd, secondStart)
  const firstToSecondEnd = getOrientation(firstStart, firstEnd, secondEnd)
  const secondToFirstStart = getOrientation(secondStart, secondEnd, firstStart)
  const secondToFirstEnd = getOrientation(secondStart, secondEnd, firstEnd)

  return (
    firstToSecondStart !== 0 &&
    firstToSecondEnd !== 0 &&
    secondToFirstStart !== 0 &&
    secondToFirstEnd !== 0 &&
    firstToSecondStart !== firstToSecondEnd &&
    secondToFirstStart !== secondToFirstEnd
  )
}

export function isCssMapPointInsidePolygon(point: CssMapPoint, polygon: CssMapPoint[]) {
  if (polygon.length < 3) return false

  let inside = false

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const current = polygon[index]
    const previous = polygon[previousIndex]

    if (isPointOnSegment(point, previous, current)) return true

    const crossesHorizontalRay = (current.y > point.y) !== (previous.y > point.y)
    if (!crossesHorizontalRay) continue

    const intersectionX = ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x
    if (point.x < intersectionX || isNearlyEqual(point.x, intersectionX)) {
      inside = !inside
    }
  }

  return inside
}

function getCssMapRectCorners(rect: CssMapRect): CssMapPoint[] {
  const right = rect.x + rect.w
  const bottom = rect.y + rect.h

  return [
    { x: rect.x, y: rect.y },
    { x: right, y: rect.y },
    { x: right, y: bottom },
    { x: rect.x, y: bottom },
  ]
}

function getClosedEdges(points: CssMapPoint[]) {
  return points.map((start, index) => ({
    start,
    end: points[(index + 1) % points.length],
  }))
}

export function isCssMapRectInsidePolygon(rect: CssMapRect, polygon: CssMapPoint[]) {
  if (rect.w < 0 || rect.h < 0 || polygon.length < 3) return false

  const corners = getCssMapRectCorners(rect)
  if (!corners.every((corner) => isCssMapPointInsidePolygon(corner, polygon))) return false

  const rectEdges = getClosedEdges(corners)
  const polygonEdges = getClosedEdges(polygon)
  const rectEdgeMidpoints = rectEdges.map(({ start, end }) => ({
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }))

  if (!rectEdgeMidpoints.every((midpoint) => isCssMapPointInsidePolygon(midpoint, polygon))) return false

  return !rectEdges.some((rectEdge) =>
    polygonEdges.some((polygonEdge) =>
      segmentsHaveProperIntersection(rectEdge.start, rectEdge.end, polygonEdge.start, polygonEdge.end),
    ),
  )
}

export function isCssMapDeviceInsideProcessBoundary(
  device: CssMapDeviceLayout,
  boundary: CssMapProcessBoundary,
) {
  return isCssMapRectInsidePolygon(
    {
      x: device.x,
      y: device.y,
      w: device.w,
      h: device.h,
    },
    boundary.points,
  )
}

export function getCssMapProcessBoundaryAssignment(
  device: CssMapDeviceLayout,
  boundaries: CssMapProcessBoundary[],
): CssMapProcessBoundaryAssignment | null {
  const boundary = boundaries.find((item) => isCssMapDeviceInsideProcessBoundary(device, item))

  return boundary
    ? {
        process: boundary.process,
        boundary,
      }
    : null
}
