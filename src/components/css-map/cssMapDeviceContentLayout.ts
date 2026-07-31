export type CssMapDeviceContentOrientation = 'vertical' | 'horizontal'

export type CssMapDeviceContentWidthBucket =
  | 'vertical-55'
  | 'vertical-70'
  | 'vertical-85'
  | 'vertical-100'
  | 'horizontal-150'
  | 'horizontal-175'
  | 'horizontal-200'
  | 'horizontal-225'

export interface CssMapDeviceContentPlanInput {
  readonly worldWidth: number
  readonly worldHeight: number
  readonly surfaceWidth: number
  readonly surfaceHeight: number
  readonly name: string
  readonly statusLabel: string
  readonly loadRateLabel: string
  readonly staffCount: number
  readonly fiveMCount: number
  readonly showStaffing: boolean
  readonly showFiveMChanges: boolean
}

export interface CssMapMarkerSlotPlan {
  readonly capacity: number
  readonly visibleMarkerCount: number
  readonly overflowCount: number
  readonly columns: number
  readonly rows: number
}

export interface CssMapDeviceContentPlan {
  readonly orientation: CssMapDeviceContentOrientation
  readonly widthBucket: CssMapDeviceContentWidthBucket
  readonly requiredWidthRatio: number
  readonly contentWidth: number
  readonly contentHeight: number
  readonly contentWidthRatio: number
  readonly isWide: boolean
  readonly nameMaxLines: number
  readonly markerCapacity: number
  readonly markerColumns: number
  readonly markerRows: number
  readonly cacheKey: string
}

export interface CssMapRightLShapeContentPlan {
  readonly headerHeightRatio: number
  readonly bodyHeightRatio: number
  readonly loadRateWidthRatio: number
  readonly detailsLeftRatio: number
  readonly detailsWidthRatio: number
}

interface WidthBucket {
  readonly key: CssMapDeviceContentWidthBucket
  readonly ratio: number
}

const NORMALIZED_CONTENT_HEIGHT = 100
const VERTICAL_MARKER_CAPACITY = 6
const HORIZONTAL_MARKER_CAPACITY = 5
const VERTICAL_MARKER_COLUMNS = 3
const HORIZONTAL_MARKER_COLUMNS = 5
const RIGHT_L_SHAPE_HEADER_BAR_RATIO = 0.55
const RIGHT_L_SHAPE_LOAD_RATE_BAR_RATIO = 0.18

const verticalWidthBuckets: readonly WidthBucket[] = [
  { key: 'vertical-55', ratio: 0.55 },
  { key: 'vertical-70', ratio: 0.7 },
  { key: 'vertical-85', ratio: 0.85 },
  { key: 'vertical-100', ratio: 1 },
]

const horizontalWidthBuckets: readonly WidthBucket[] = [
  { key: 'horizontal-150', ratio: 1.5 },
  { key: 'horizontal-175', ratio: 1.75 },
  { key: 'horizontal-200', ratio: 2 },
  { key: 'horizontal-225', ratio: 2.25 },
]

function getCharacterWidthWeight(character: string): number {
  if (/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/u.test(character)) return 0.5
  if (/[\u0000-\u007f]/u.test(character)) return 0.62
  return 1
}

export function estimateCssMapTextWidth(text: string, fontSize: number): number {
  return Array.from(text).reduce(
    (width, character) => width + getCharacterWidthWeight(character) * fontSize,
    0,
  )
}

export function planCssMapMarkerSlots(
  itemCount: number,
  orientation: CssMapDeviceContentOrientation,
): CssMapMarkerSlotPlan {
  const normalizedCount = Math.max(0, Math.floor(itemCount))
  const capacity = orientation === 'vertical'
    ? VERTICAL_MARKER_CAPACITY
    : HORIZONTAL_MARKER_CAPACITY
  const maximumColumns = orientation === 'vertical'
    ? VERTICAL_MARKER_COLUMNS
    : HORIZONTAL_MARKER_COLUMNS
  const hasOverflow = normalizedCount > capacity
  const visibleMarkerCount = hasOverflow
    ? Math.max(0, capacity - 1)
    : normalizedCount
  const overflowCount = hasOverflow
    ? normalizedCount - visibleMarkerCount
    : 0
  const occupiedSlots = visibleMarkerCount + (overflowCount > 0 ? 1 : 0)

  return {
    capacity,
    visibleMarkerCount,
    overflowCount,
    columns: Math.min(maximumColumns, occupiedSlots),
    rows: occupiedSlots === 0 ? 0 : Math.ceil(occupiedSlots / maximumColumns),
  }
}

export function planCssMapRightLShapeContent(
  legStartRatio: number,
  barHeightRatio: number,
): CssMapRightLShapeContentPlan {
  const headerHeightRatio = barHeightRatio * RIGHT_L_SHAPE_HEADER_BAR_RATIO
  const loadRateWidthRatio = legStartRatio * RIGHT_L_SHAPE_LOAD_RATE_BAR_RATIO

  return {
    headerHeightRatio,
    bodyHeightRatio: barHeightRatio - headerHeightRatio,
    loadRateWidthRatio,
    detailsLeftRatio: loadRateWidthRatio,
    detailsWidthRatio: legStartRatio - loadRateWidthRatio,
  }
}

function estimateMarkerRowWidth(
  label: string,
  itemCount: number,
  orientation: CssMapDeviceContentOrientation,
): number {
  const slotPlan = planCssMapMarkerSlots(itemCount, orientation)
  const slotCount = slotPlan.visibleMarkerCount + (slotPlan.overflowCount > 0 ? 1 : 0)
  const columnCount = orientation === 'vertical'
    ? Math.min(VERTICAL_MARKER_COLUMNS, slotCount)
    : slotCount
  const labelWidth = estimateCssMapTextWidth(label, 7)
  const markerSize = orientation === 'vertical' ? 14 : 16
  const markerGap = orientation === 'vertical' ? 3 : 3
  const markersWidth = columnCount > 0
    ? columnCount * markerSize + Math.max(0, columnCount - 1) * markerGap
    : estimateCssMapTextWidth('--', 8)

  return labelWidth + 4 + markersWidth + 10
}

function estimateVerticalRequiredRatio(input: CssMapDeviceContentPlanInput): number {
  const nameWidth = estimateCssMapTextWidth(input.name, 12) / 3 + 12
  const statusWidth = estimateCssMapTextWidth(input.statusLabel, 11) + 16
  const loadRateWidth = estimateCssMapTextWidth('负荷率', 7)
    + estimateCssMapTextWidth(input.loadRateLabel, 9)
    + 10
  const staffWidth = input.showStaffing
    ? estimateMarkerRowWidth('人员', input.staffCount, 'vertical')
    : 0
  const fiveMWidth = input.showFiveMChanges
    ? estimateMarkerRowWidth('5M', input.fiveMCount, 'vertical')
    : 0

  return Math.max(nameWidth, statusWidth, loadRateWidth, staffWidth, fiveMWidth)
    / NORMALIZED_CONTENT_HEIGHT
}

function estimateHorizontalRequiredRatio(input: CssMapDeviceContentPlanInput): number {
  const nameWidth = estimateCssMapTextWidth(input.name, 10) / 2
  const statusWidth = estimateCssMapTextWidth(input.statusLabel, 9)
  const headerWidth = nameWidth + statusWidth + 20
  const loadRateWidth = Math.max(
    42,
    estimateCssMapTextWidth(input.loadRateLabel, 10) + 12,
  )
  const staffWidth = input.showStaffing
    ? estimateMarkerRowWidth('人员', input.staffCount, 'horizontal')
    : 0
  const fiveMWidth = input.showFiveMChanges
    ? estimateMarkerRowWidth('5M', input.fiveMCount, 'horizontal')
    : 0
  const detailWidth = Math.max(staffWidth, fiveMWidth, 32)
  const bodyWidth = loadRateWidth + detailWidth + 8

  return Math.max(headerWidth, bodyWidth) / NORMALIZED_CONTENT_HEIGHT
}

function selectWidthBucket(
  estimatedRatio: number,
  buckets: readonly WidthBucket[],
): WidthBucket {
  return buckets.find((bucket) => estimatedRatio <= bucket.ratio)
    ?? buckets[buckets.length - 1]
}

export function planCssMapDeviceContent(
  input: CssMapDeviceContentPlanInput,
): CssMapDeviceContentPlan {
  const worldWidth = Math.max(input.worldWidth, 1)
  const worldHeight = Math.max(input.worldHeight, 1)
  const surfaceWidth = Math.max(input.surfaceWidth, 1)
  const surfaceHeight = Math.max(input.surfaceHeight, 1)
  const orientation: CssMapDeviceContentOrientation = worldHeight >= worldWidth
    ? 'vertical'
    : 'horizontal'
  const estimatedRatio = orientation === 'vertical'
    ? estimateVerticalRequiredRatio(input)
    : estimateHorizontalRequiredRatio(input)
  const bucket = selectWidthBucket(
    estimatedRatio,
    orientation === 'vertical' ? verticalWidthBuckets : horizontalWidthBuckets,
  )
  const contentWidth = Math.min(surfaceWidth, surfaceHeight * bucket.ratio)
  const contentWidthRatio = Math.min(1, contentWidth / surfaceWidth)
  const markerCapacity = orientation === 'vertical'
    ? VERTICAL_MARKER_CAPACITY
    : HORIZONTAL_MARKER_CAPACITY
  const markerColumns = orientation === 'vertical'
    ? VERTICAL_MARKER_COLUMNS
    : HORIZONTAL_MARKER_COLUMNS

  return {
    orientation,
    widthBucket: bucket.key,
    requiredWidthRatio: bucket.ratio,
    contentWidth,
    contentHeight: surfaceHeight,
    contentWidthRatio,
    isWide: surfaceWidth - contentWidth > 0.5,
    nameMaxLines: orientation === 'vertical' ? 3 : 2,
    markerCapacity,
    markerColumns,
    markerRows: orientation === 'vertical' ? 2 : 1,
    cacheKey: `${orientation}:${bucket.key}`,
  }
}
