import { describe, expect, it, vi } from 'vitest'
import type { CssMapDevice, CssMapDisplayOptions } from './css3dMapTypes'
import {
  getSpriteCssMapDeviceColorPlan,
  getSpriteCssMapStatusLabel,
} from './spriteCssMapDeviceCard'
import {
  cssMapFiveMCategoryOrder,
  getCssMapFiveMVisualStyle,
} from './css3dMapPalette'
import {
  drawSpriteCssMapFiveMMarker,
  getSpriteCssMapFiveMMarkerGlyph,
  getSpriteCssMapFiveMMarkerPlan,
} from './spriteCssMapFiveMMarker'
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

  it('5M 变化点使用固定类别顺序、glyph 和主题协调色', () => {
    expect(cssMapFiveMCategoryOrder.map((category) => (
      getCssMapFiveMVisualStyle(category)
    ))).toEqual([
      { glyph: '人', fill: '#7C3FA1', color: '#FFFFFF', border: 'var(--um-color-operation)' },
      { glyph: '机', fill: '#C9363E', color: '#FFFFFF', border: 'var(--um-color-operation)' },
      { glyph: '料', fill: '#2E8B3C', color: '#FFFFFF', border: 'var(--um-color-operation)' },
      { glyph: '法', fill: '#162033', color: '#FFFFFF', border: 'var(--um-color-operation)' },
      { glyph: '环', fill: '#F5D90A', color: '#162033', border: 'var(--um-color-operation)' },
    ])

    const methodChange = {
      id: 'change-1',
      category: 'method' as const,
      label: '方法变化',
    }
    expect(getSpriteCssMapFiveMMarkerGlyph(methodChange)).toBe('法')
    expect(getSpriteCssMapFiveMMarkerPlan(
      methodChange,
      createSpriteCssMapCanvasTheme(),
    )).toEqual({
      glyph: '法',
      fill: '#162033',
      color: '#FFFFFF',
      border: '#2471FF',
    })

    expect(getCssMapFiveMVisualStyle('environment').color).toBe('#162033')
  })

  it('Sprite 5M 标记绘制四点菱形并保持 glyph 正向居中', () => {
    const context = {
      save: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D

    drawSpriteCssMapFiveMMarker(
      context,
      {
        id: 'change-machine',
        category: 'machine',
        label: '设备变化',
      },
      10,
      20,
      18,
      createSpriteCssMapCanvasTheme(),
    )

    expect(context.moveTo).toHaveBeenCalledWith(19, 20.5)
    expect(context.lineTo).toHaveBeenNthCalledWith(1, 27.5, 29)
    expect(context.lineTo).toHaveBeenNthCalledWith(2, 19, 37.5)
    expect(context.lineTo).toHaveBeenNthCalledWith(3, 10.5, 29)
    expect(context.closePath).toHaveBeenCalledOnce()
    expect(context.fillText).toHaveBeenCalledWith('机', 19, 29.5)
    expect(context.restore).toHaveBeenCalledOnce()
  })

  it('设备状态和负荷率颜色解析为设计系统颜色', () => {
    const colors = getSpriteCssMapDeviceColorPlan(createDevice(), display, createSpriteCssMapCanvasTheme())

    expect(getSpriteCssMapStatusLabel('production')).toBe('生产中')
    expect(colors.statusBackground).toBe('#E6F6EE')
    expect(colors.statusBorder).toBe('#22A06B')
    expect(colors.loadRateBackground).toBe('rgba(34, 197, 94, 0.86)')
  })
})
