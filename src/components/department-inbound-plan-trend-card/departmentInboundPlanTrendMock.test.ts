import { describe, expect, it } from 'vitest'
import type { SegmentVO } from '../../api/basic'
import {
  createDepartmentInboundPlanTrendCardData,
} from './departmentInboundPlanTrendMock'
import type { DepartmentInboundDailyRow } from './departmentInboundPlanTrendMock'

const segmentMap: Readonly<Record<string, readonly SegmentVO[]>> = {
  p1: [
    { segmentIndex: 1, startDay: 1, endDay: 2 },
    { segmentIndex: 2, startDay: 3, endDay: 4 },
  ],
}

function lookupSegments(processType: string): readonly SegmentVO[] | null {
  return segmentMap[processType] ?? null
}

describe('createDepartmentInboundPlanTrendCardData', () => {
  it('只输出周列，不输出月列或日列，并按汇总分子分母重算达成率', () => {
    // Given: 单工序每日入库 mock 数据，其中日达成率平均值不等于周达成率
    const dailyRows: readonly DepartmentInboundDailyRow[] = [
      { processType: 'p1', day: 1, planInbound: 100, actualInbound: 50 },
      { processType: 'p1', day: 2, planInbound: 300, actualInbound: 350 },
      { processType: 'p1', day: 3, planInbound: 200, actualInbound: 180 },
      { processType: 'p1', day: 4, planInbound: 200, actualInbound: 220 },
    ]

    // When: 按周配置汇总为入库计划趋势卡
    const card = createDepartmentInboundPlanTrendCardData(['p1'], lookupSegments, dailyRows)

    // Then: 表格和图表只展示周粒度，week1 达成率为 400/400
    if (card === null) {
      throw new Error('expected inbound plan trend card data')
    }
    const keys = card.tableColumns.map((column) => column.key)
    expect(keys).toEqual(['week1', 'week2'])
    expect(keys.some((key) => key === 'month' || key.startsWith('day'))).toBe(false)
    expect(card.chartData.xAxisData).toEqual(['1W', '2W'])
    expect(card.tableData.planInbound.week1).toBe(400)
    expect(card.tableData.actualInbound.week1).toBe(400)
    expect(card.tableData.gap.week1).toBe(0)
    expect(card.tableData.achievementRate.week1).toBe(100)
  })
})
