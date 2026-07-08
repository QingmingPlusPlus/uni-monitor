import { describe, expect, it } from 'vitest'
import type { CssMapDevice, CssMapDisplayOptions } from './css3dMapTypes'
import {
  getSpriteCssMapDeviceColorPlan,
  getSpriteCssMapStatusLabel,
} from './spriteCssMapDeviceCard'
import { getSpriteCssMapFiveMMarkerGlyph } from './spriteCssMapFiveMMarker'
import { getSpriteCssMapStaffMarkerPlan } from './spriteCssMapStaffMarker'
import { createSpriteCssMapCanvasTheme } from './spriteCssMapTheme'

const display: CssMapDisplayOptions = {
  showStatusColor: true,
  showLoadRateColor: true,
  showStaffing: true,
  showFiveMChanges: true,
}

function createDevice(): CssMapDevice {
  return {
    id: 'device-1',
    name: '测试设备',
    section: null,
    x: 0,
    y: 0,
    w: 100,
    h: 80,
    deviceCodes: ['D-01'],
    children: [],
    runtime: {
      status: 'production',
      loadRate: 85,
      staff: [],
      fiveMChanges: [],
    },
  }
}

describe('sprite css-map markers and colors', () => {
  it('人员扇形沿用现有班次角度和人员颜色', () => {
    expect(getSpriteCssMapStaffMarkerPlan({
      id: 'staff-1',
      name: '张三',
      category: 'operator',
      shift: 'full',
    })).toEqual({
      angle: 180,
      color: 'rgba(22, 119, 255, 0.92)',
    })

    expect(getSpriteCssMapStaffMarkerPlan({
      id: 'staff-2',
      name: '李四',
      category: 'operator',
      shift: 'short',
    }).angle).toBe(120)
  })

  it('5M 变化点沿用人机料法环 glyph', () => {
    expect(getSpriteCssMapFiveMMarkerGlyph({
      id: 'change-1',
      category: 'method',
      label: '方法变化',
    })).toBe('法')
  })

  it('设备状态和负荷率颜色解析为设计系统颜色', () => {
    const colors = getSpriteCssMapDeviceColorPlan(createDevice(), display, createSpriteCssMapCanvasTheme())

    expect(getSpriteCssMapStatusLabel('production')).toBe('生产中')
    expect(colors.statusBackground).toBe('#E6F6EE')
    expect(colors.statusBorder).toBe('#22A06B')
    expect(colors.loadRateBackground).toBe('rgba(34, 197, 94, 0.86)')
  })
})
