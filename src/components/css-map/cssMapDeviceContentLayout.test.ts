import { describe, expect, it } from 'vitest'
import {
  estimateCssMapTextWidth,
  planCssMapDeviceContent,
  planCssMapMarkerSlots,
  planCssMapRightLShapeContent,
} from './cssMapDeviceContentLayout'

function createPlan(overrides: Partial<Parameters<typeof planCssMapDeviceContent>[0]> = {}) {
  return planCssMapDeviceContent({
    worldWidth: 85,
    worldHeight: 44,
    surfaceWidth: 85,
    surfaceHeight: 44,
    name: '自动喷涂粘接-2',
    statusLabel: '生产中',
    loadRateLabel: '78.0%',
    staffCount: 3,
    fiveMCount: 1,
    showStaffing: true,
    showFiveMChanges: true,
    ...overrides,
  })
}

describe('planCssMapDeviceContent', () => {
  it('纵向设备使用完整占位宽度', () => {
    const plan = createPlan({
      worldWidth: 65,
      worldHeight: 121,
      surfaceWidth: 65,
      surfaceHeight: 121,
      name: '自动喷涂粘接-1',
    })

    expect(plan.orientation).toBe('vertical')
    expect(plan.nameMaxLines).toBe(3)
    expect(plan.markerCapacity).toBe(6)
    expect(plan.contentWidth).toBe(65)
    expect(plan.contentWidthRatio).toBe(1)
    expect(plan.isWide).toBe(false)
  })

  it('横向设备按内容宽度靠左显示并保留右侧空白', () => {
    const plan = createPlan()

    expect(plan.orientation).toBe('horizontal')
    expect(plan.widthBucket).toBe('horizontal-150')
    expect(plan.contentWidth).toBe(66)
    expect(plan.contentWidthRatio).toBeCloseTo(66 / 85)
    expect(plan.isWide).toBe(true)
  })

  it('内容跨档时才扩大横向信息区', () => {
    const sparse = createPlan({ staffCount: 1 })
    const regular = createPlan({ staffCount: 3 })
    const expanded = createPlan({ staffCount: 4 })
    const hidden = createPlan({ staffCount: 5, showStaffing: false, fiveMCount: 0 })

    expect(sparse.widthBucket).toBe(regular.widthBucket)
    expect(regular.widthBucket).toBe('horizontal-150')
    expect(expanded.widthBucket).toBe('horizontal-175')
    expect(hidden.widthBucket).toBe('horizontal-150')
  })

  it('地图缩放不改变方向、档位和相对内容宽度', () => {
    const normal = createPlan()
    const zoomed = createPlan({
      surfaceWidth: 255,
      surfaceHeight: 132,
    })

    expect(zoomed.orientation).toBe(normal.orientation)
    expect(zoomed.widthBucket).toBe(normal.widthBucket)
    expect(zoomed.contentWidthRatio).toBeCloseTo(normal.contentWidthRatio)
  })

  it('按稳定字符权重估算中日韩、ASCII 与标点宽度', () => {
    expect(estimateCssMapTextWidth('人A-', 10)).toBeCloseTo(21.2)
  })
})

describe('planCssMapMarkerSlots', () => {
  it('纵向最多六槽并在最后一槽汇总溢出', () => {
    expect(planCssMapMarkerSlots(7, 'vertical')).toEqual({
      capacity: 6,
      visibleMarkerCount: 5,
      overflowCount: 2,
      columns: 3,
      rows: 2,
    })
  })

  it('横向最多五槽并在最后一槽汇总溢出', () => {
    expect(planCssMapMarkerSlots(6, 'horizontal')).toEqual({
      capacity: 5,
      visibleMarkerCount: 4,
      overflowCount: 2,
      columns: 5,
      rows: 1,
    })
  })
})

describe('planCssMapRightLShapeContent', () => {
  it('把负荷率放在横条左侧并将右侧凸出竖条留空', () => {
    const plan = planCssMapRightLShapeContent(0.8, 0.4)

    expect(plan.headerHeightRatio).toBeCloseTo(0.22)
    expect(plan.bodyHeightRatio).toBeCloseTo(0.18)
    expect(plan.loadRateWidthRatio).toBeCloseTo(0.144)
    expect(plan.detailsLeftRatio).toBeCloseTo(0.144)
    expect(plan.detailsWidthRatio).toBeCloseTo(0.656)
    expect(plan.detailsLeftRatio + plan.detailsWidthRatio).toBeCloseTo(0.8)
  })
})
