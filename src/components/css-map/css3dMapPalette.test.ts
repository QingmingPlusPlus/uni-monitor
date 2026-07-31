import { describe, expect, it } from 'vitest'
import {
  cssMapFiveMCategoryOrder,
  cssMapFiveMVisualPalette,
  cssMapNeutralLoadRateBackground,
  cssMapStaffCategoryColors,
  cssMapStatusPalette,
  getCssMapFiveMGlyph,
  getCssMapFiveMVisualStyle,
  getCssMapLoadRateBackground,
  getCssMapStaffColor,
  getCssMapStaffShiftAngle,
  getCssMapTitleStyle,
} from './css3dMapPalette'

describe('cssMapStatusPalette', () => {
  it('为每个设备状态提供 background/border/color 三元组', () => {
    const statuses: Array<keyof typeof cssMapStatusPalette> = [
      'production',
      'abnormalStop',
      'plannedStop',
      'changeover',
      'cleaning',
      'neutral',
    ]
    for (const status of statuses) {
      const style = cssMapStatusPalette[status]
      expect(style.background).toBeTruthy()
      expect(style.border).toBeTruthy()
      expect(style.color).toBeTruthy()
    }
  })
})

describe('getCssMapTitleStyle', () => {
  it('未启用时返回 neutralTitle', () => {
    expect(getCssMapTitleStyle('production', false)).toEqual({
      background: 'rgba(255, 255, 255, 0.86)',
      border: 'var(--um-color-border)',
      color: 'var(--um-color-text-primary)',
    })
  })

  it('status 为 null 时返回 neutralTitle', () => {
    expect(getCssMapTitleStyle(null, true)).toEqual({
      background: 'rgba(255, 255, 255, 0.86)',
      border: 'var(--um-color-border)',
      color: 'var(--um-color-text-primary)',
    })
  })

  it('未启用且 status 为 null 时仍返回 neutralTitle', () => {
    expect(getCssMapTitleStyle(null, false)).toEqual({
      background: 'rgba(255, 255, 255, 0.86)',
      border: 'var(--um-color-border)',
      color: 'var(--um-color-text-primary)',
    })
  })

  it('启用且有 status 时返回对应调色板条目', () => {
    expect(getCssMapTitleStyle('production', true)).toEqual(cssMapStatusPalette.production)
    expect(getCssMapTitleStyle('abnormalStop', true)).toEqual(cssMapStatusPalette.abnormalStop)
  })

  it('enabled 默认为 true', () => {
    expect(getCssMapTitleStyle('cleaning')).toEqual(cssMapStatusPalette.cleaning)
  })
})

describe('getCssMapLoadRateBackground', () => {
  it('未启用时返回中性背景', () => {
    expect(getCssMapLoadRateBackground(50, false)).toBe(cssMapNeutralLoadRateBackground)
  })

  it('loadRate 为 null 时返回中性背景', () => {
    expect(getCssMapLoadRateBackground(null, true)).toBe(cssMapNeutralLoadRateBackground)
  })

  it('按阈值返回负荷率颜色', () => {
    expect(getCssMapLoadRateBackground(0)).toBe('rgba(255, 77, 79, 0.88)')
    expect(getCssMapLoadRateBackground(30)).toBe('rgba(255, 77, 79, 0.88)')
    expect(getCssMapLoadRateBackground(31)).toBe('rgba(251, 146, 60, 0.88)')
    expect(getCssMapLoadRateBackground(40)).toBe('rgba(251, 146, 60, 0.88)')
    expect(getCssMapLoadRateBackground(41)).toBe('rgba(250, 204, 21, 0.88)')
    expect(getCssMapLoadRateBackground(60)).toBe('rgba(250, 204, 21, 0.88)')
    expect(getCssMapLoadRateBackground(61)).toBe('rgba(163, 230, 53, 0.84)')
    expect(getCssMapLoadRateBackground(80)).toBe('rgba(163, 230, 53, 0.84)')
    expect(getCssMapLoadRateBackground(81)).toBe('rgba(34, 197, 94, 0.86)')
    expect(getCssMapLoadRateBackground(100)).toBe('rgba(34, 197, 94, 0.86)')
    expect(getCssMapLoadRateBackground(101)).toBe('rgba(59, 130, 246, 0.88)')
  })

  it('enabled 默认为 true', () => {
    expect(getCssMapLoadRateBackground(50)).toBe('rgba(250, 204, 21, 0.88)')
  })
})

describe('getCssMapStaffColor', () => {
  it('返回人员类别颜色', () => {
    expect(getCssMapStaffColor('operator')).toBe('rgba(22, 119, 255, 0.92)')
  })

  it('与 cssMapStaffCategoryColors 一致', () => {
    expect(getCssMapStaffColor('operator')).toBe(cssMapStaffCategoryColors.operator)
  })
})

describe('getCssMapStaffShiftAngle', () => {
  it('full 班次返回 180 度', () => {
    expect(getCssMapStaffShiftAngle('full')).toBe(180)
  })

  it('short 班次返回 120 度', () => {
    expect(getCssMapStaffShiftAngle('short')).toBe(120)
  })
})

describe('getCssMapFiveMVisualStyle', () => {
  it('为每个 5M 类别返回视觉样式', () => {
    for (const category of cssMapFiveMCategoryOrder) {
      const style = getCssMapFiveMVisualStyle(category)
      expect(style.glyph).toBeTruthy()
      expect(style.fill).toBeTruthy()
      expect(style.color).toBeTruthy()
      expect(style.border).toBe('var(--um-color-operation)')
    }
  })

  it('与 cssMapFiveMVisualPalette 一致', () => {
    for (const category of cssMapFiveMCategoryOrder) {
      expect(getCssMapFiveMVisualStyle(category)).toEqual(cssMapFiveMVisualPalette[category])
    }
  })
})

describe('getCssMapFiveMGlyph', () => {
  it('返回对应类别的 glyph', () => {
    expect(getCssMapFiveMGlyph('man')).toBe('人')
    expect(getCssMapFiveMGlyph('machine')).toBe('机')
    expect(getCssMapFiveMGlyph('material')).toBe('料')
    expect(getCssMapFiveMGlyph('method')).toBe('法')
    expect(getCssMapFiveMGlyph('environment')).toBe('环')
  })

  it('与 getCssMapFiveMVisualStyle 的 glyph 一致', () => {
    for (const category of cssMapFiveMCategoryOrder) {
      expect(getCssMapFiveMGlyph(category)).toBe(getCssMapFiveMVisualStyle(category).glyph)
    }
  })
})