import type {
  CssMapDeviceStatus,
  CssMapFiveMCategory,
  CssMapStaffCategory,
  CssMapStaffShift,
} from './css3dMapTypes'

interface CssMapTitleStyle {
  background: string
  color: string
}

export const cssMapStatusPalette: Record<CssMapDeviceStatus, CssMapTitleStyle> = {
  production: {
    background: 'rgba(187, 247, 208, 0.95)',
    color: '#14213d',
  },
  abnormalStop: {
    background: 'rgba(255, 77, 79, 0.9)',
    color: '#ffffff',
  },
  plannedStop: {
    background: 'rgba(255, 255, 255, 0.86)',
    color: '#14213d',
  },
  changeover: {
    background: 'rgba(250, 204, 21, 0.95)',
    color: '#14213d',
  },
  cleaning: {
    background: 'rgba(250, 204, 21, 0.95)',
    color: '#14213d',
  },
  neutral: {
    background: 'rgba(255, 255, 255, 0.86)',
    color: '#14213d',
  },
}

const neutralTitle: CssMapTitleStyle = {
  background: 'rgba(255, 255, 255, 0.86)',
  color: '#14213d',
}

export const cssMapNeutralLoadRateBackground = 'rgba(255, 255, 255, 0.72)'

export const cssMapStaffCategoryColors: Record<CssMapStaffCategory, string> = {
  operator: 'rgba(22, 119, 255, 0.92)',
}

export const cssMapFiveMGlyphs: Record<CssMapFiveMCategory, string> = {
  man: '人',
  machine: '机',
  material: '料',
  method: '法',
  environment: '环',
}

export function getCssMapTitleStyle(status: CssMapDeviceStatus | null, enabled = true) {
  if (!enabled || !status) return neutralTitle
  return cssMapStatusPalette[status]
}

export function getCssMapLoadRateBackground(loadRate: number | null, enabled = true) {
  if (!enabled || loadRate === null) return cssMapNeutralLoadRateBackground
  if (loadRate <= 30) return 'rgba(255, 77, 79, 0.88)'
  if (loadRate <= 40) return 'rgba(251, 146, 60, 0.88)'
  if (loadRate <= 60) return 'rgba(250, 204, 21, 0.88)'
  if (loadRate <= 80) return 'rgba(163, 230, 53, 0.84)'
  if (loadRate <= 100) return 'rgba(34, 197, 94, 0.86)'
  return 'rgba(59, 130, 246, 0.88)'
}

export function getCssMapStaffColor(category: CssMapStaffCategory) {
  return cssMapStaffCategoryColors[category]
}

export function getCssMapStaffShiftAngle(shift: CssMapStaffShift) {
  return shift === 'full' ? 180 : 120
}

export function getCssMapFiveMGlyph(category: CssMapFiveMCategory) {
  return cssMapFiveMGlyphs[category]
}
