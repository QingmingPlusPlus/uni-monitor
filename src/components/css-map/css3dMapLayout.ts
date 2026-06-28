import type {
  CssMapDeviceDisplayMode,
  CssMapDeviceScreenRect,
  CssMapDisplayOptions,
} from './css3dMapTypes'

const FULL_SAFE_WIDTH = 300
const FULL_SAFE_HEIGHT = 160
const FULL_STAFF_SIZE = 56
const FULL_STAFF_GAP = 7
const FULL_STAFF_PADDING = 14
const FULL_FIVE_M_SIZE = 36
const FULL_FIVE_M_GAP = 3
const FULL_FIVE_M_PADDING = 8
const COMPACT_STAFF_SIZE = 20
const COMPACT_STAFF_GAP = 4
const COMPACT_STAFF_PADDING = 8
const COMPACT_FIVE_M_SIZE = 22
const COMPACT_FIVE_M_GAP = 3
const COMPACT_FIVE_M_PADDING = 8
const MERGED_CHILDREN_ENTER_MIN_SIDE = 92
const MERGED_CHILDREN_EXIT_MIN_SIDE = 74
const MERGED_CHILDREN_ENTER_AREA_PER_CHILD = 1300
const MERGED_CHILDREN_EXIT_AREA_PER_CHILD = 820

export interface CssMapDeviceLayoutPlanInput {
  screen: CssMapDeviceScreenRect
  display: CssMapDisplayOptions
  staffCount: number
  fiveMCount: number
}

export interface CssMapDeviceLayoutPlan {
  mode: CssMapDeviceDisplayMode
  contentScale: number
  showStaffingDetails: boolean
  showFiveMDetails: boolean
  showDetailSummary: boolean
}

export interface CssMapMergedDeviceChildrenPlanInput {
  screen: CssMapDeviceScreenRect
  childCount: number
  current: boolean
}

function getGroupWidth(count: number, itemSize: number, gap: number, padding: number) {
  if (count <= 0) return 0
  return count * itemSize + Math.max(count - 1, 0) * gap + padding
}

function combineDetailWidth(staffWidth: number, fiveMWidth: number, gap: number) {
  if (staffWidth <= 0) return fiveMWidth
  if (fiveMWidth <= 0) return staffWidth
  return staffWidth + fiveMWidth + gap
}

function getFullContentScale(width: number, height: number) {
  if (width < 420 || height < 240) return 1

  const roomScale = Math.min(width / FULL_SAFE_WIDTH, height / FULL_SAFE_HEIGHT)
  return 1 + Math.max(roomScale - 1, 0) * 0.32
}

export function planCssMapDeviceNode(input: CssMapDeviceLayoutPlanInput): CssMapDeviceLayoutPlan {
  const width = Math.max(input.screen.width, 0)
  const height = Math.max(input.screen.height, 0)
  const visibleStaffCount = input.display.showStaffing ? input.staffCount : 0
  const visibleFiveMCount = input.display.showFiveMChanges ? input.fiveMCount : 0
  const hasDetails = visibleStaffCount > 0 || visibleFiveMCount > 0

  const fullStaffWidth = getGroupWidth(
    visibleStaffCount,
    FULL_STAFF_SIZE,
    FULL_STAFF_GAP,
    FULL_STAFF_PADDING,
  )
  const fullFiveMWidth = getGroupWidth(
    visibleFiveMCount,
    FULL_FIVE_M_SIZE,
    FULL_FIVE_M_GAP,
    FULL_FIVE_M_PADDING,
  )
  const fullDetailWidth = combineDetailWidth(fullStaffWidth, fullFiveMWidth, 8)
  const fullDetailsFit = !hasDetails || fullDetailWidth <= width - 18
  let fullContentScale = getFullContentScale(width, height)

  if (fullDetailsFit) {
    const fullBodyBaseHeight = hasDetails ? 114 : 50
    const heightScaleLimit = Math.max((height - 44) / fullBodyBaseHeight, 1)
    const widthScaleLimit = fullDetailWidth > 0 ? Math.max((width - 18) / fullDetailWidth, 1) : fullContentScale

    fullContentScale = Math.min(fullContentScale, heightScaleLimit, widthScaleLimit)
  }

  if (width >= FULL_SAFE_WIDTH && height >= FULL_SAFE_HEIGHT && fullDetailsFit) {
    return {
      mode: 'full',
      contentScale: fullContentScale,
      showStaffingDetails: visibleStaffCount > 0,
      showFiveMDetails: visibleFiveMCount > 0,
      showDetailSummary: false,
    }
  }

  const compactStaffWidth = getGroupWidth(
    visibleStaffCount,
    COMPACT_STAFF_SIZE,
    COMPACT_STAFF_GAP,
    COMPACT_STAFF_PADDING,
  )
  const compactFiveMWidth = getGroupWidth(
    visibleFiveMCount,
    COMPACT_FIVE_M_SIZE,
    COMPACT_FIVE_M_GAP,
    COMPACT_FIVE_M_PADDING,
  )
  const compactDetailWidth = combineDetailWidth(compactStaffWidth, compactFiveMWidth, 6)
  const compactDetailsFit = !hasDetails || compactDetailWidth <= width - 12
  const compactHeight = hasDetails ? 104 : 76

  if (width >= 132 && height >= compactHeight && compactDetailsFit) {
    return {
      mode: 'compact',
      contentScale: 1,
      showStaffingDetails: visibleStaffCount > 0,
      showFiveMDetails: visibleFiveMCount > 0,
      showDetailSummary: false,
    }
  }

  const summaryWidth = 78 + (visibleFiveMCount > 0 ? Math.min(visibleFiveMCount, 5) * 10 : 0)
  const summaryHeight = hasDetails ? 76 : 58

  if (width >= summaryWidth && height >= summaryHeight) {
    return {
      mode: 'summary',
      contentScale: 1,
      showStaffingDetails: false,
      showFiveMDetails: false,
      showDetailSummary: hasDetails,
    }
  }

  return {
    mode: 'micro',
    contentScale: 1,
    showStaffingDetails: false,
    showFiveMDetails: false,
    showDetailSummary: false,
  }
}

export function shouldShowCssMapMergedDeviceChildren(input: CssMapMergedDeviceChildrenPlanInput) {
  if (input.childCount <= 1) return false

  const width = Math.max(input.screen.width, 0)
  const height = Math.max(input.screen.height, 0)
  const minSide = Math.min(width, height)
  const areaPerChild = (width * height) / input.childCount
  const minSideThreshold = input.current
    ? MERGED_CHILDREN_EXIT_MIN_SIDE
    : MERGED_CHILDREN_ENTER_MIN_SIDE
  const areaThreshold = input.current
    ? MERGED_CHILDREN_EXIT_AREA_PER_CHILD
    : MERGED_CHILDREN_ENTER_AREA_PER_CHILD

  return minSide >= minSideThreshold && areaPerChild >= areaThreshold
}
