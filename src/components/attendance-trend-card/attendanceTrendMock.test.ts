import { describe, expect, it } from 'vitest'
import type { SegmentVO } from '../../api/basic'
import {
  createAttendanceTrendCardData,
} from './attendanceTrendMock'
import type { AttendanceTrendDailyRow } from './attendanceTrendMock'

const segmentMap: Readonly<Record<string, readonly SegmentVO[]>> = {
  p1: [
    { segmentIndex: 1, startDay: 1, endDay: 2 },
    { segmentIndex: 2, startDay: 3, endDay: 4 },
  ],
  p2: [
    { segmentIndex: 1, startDay: 1, endDay: 3 },
    { segmentIndex: 2, startDay: 4, endDay: 4 },
  ],
}

function lookupSegments(processType: string): readonly SegmentVO[] | null {
  return segmentMap[processType] ?? null
}

function expectWeeklyOnly(keys: readonly string[]): void {
  expect(keys).toEqual(['week1', 'week2'])
  expect(keys.some((key) => key === 'month' || key.startsWith('day'))).toBe(false)
}

describe('createAttendanceTrendCardData', () => {
  it('只输出周列，不输出月列或日列', () => {
    // Given: 单工序每日出勤 mock 数据和两段周配置
    const dailyRows: readonly AttendanceTrendDailyRow[] = [
      { processType: 'p1', day: 1, indirectCount: 1, directCount: 10, directAttendance: 9, targetRate: 91 },
      { processType: 'p1', day: 2, indirectCount: 1, directCount: 10, directAttendance: 8, targetRate: 91 },
      { processType: 'p1', day: 3, indirectCount: 1, directCount: 10, directAttendance: 7, targetRate: 91 },
      { processType: 'p1', day: 4, indirectCount: 1, directCount: 10, directAttendance: 10, targetRate: 91 },
    ]

    // When: 按周配置汇总为趋势卡
    const card = createAttendanceTrendCardData(['p1'], lookupSegments, dailyRows)

    // Then: 表格列和图表横轴都只保留周粒度
    if (card === null) {
      throw new Error('expected attendance trend card data')
    }
    expectWeeklyOnly(card.tableColumns.map((column) => column.key))
    expect(card.chartData.xAxisData).toEqual(['1W', '2W'])
  })

  it('同一部门多个工序按各自周配置先汇总再按周序号合并', () => {
    // Given: 两个工序有不同的 week1 日期范围
    const dailyRows: readonly AttendanceTrendDailyRow[] = [
      { processType: 'p1', day: 1, indirectCount: 1, directCount: 10, directAttendance: 9, targetRate: 90 },
      { processType: 'p1', day: 2, indirectCount: 1, directCount: 10, directAttendance: 8, targetRate: 90 },
      { processType: 'p1', day: 3, indirectCount: 1, directCount: 10, directAttendance: 7, targetRate: 90 },
      { processType: 'p1', day: 4, indirectCount: 1, directCount: 10, directAttendance: 10, targetRate: 90 },
      { processType: 'p2', day: 1, indirectCount: 2, directCount: 20, directAttendance: 18, targetRate: 96 },
      { processType: 'p2', day: 2, indirectCount: 2, directCount: 20, directAttendance: 17, targetRate: 96 },
      { processType: 'p2', day: 3, indirectCount: 2, directCount: 20, directAttendance: 16, targetRate: 96 },
      { processType: 'p2', day: 4, indirectCount: 2, directCount: 20, directAttendance: 20, targetRate: 96 },
    ]

    // When: 汇总部门口径 week1
    const card = createAttendanceTrendCardData(['p1', 'p2'], lookupSegments, dailyRows)

    // Then: week1 使用 p1 的 1-2 日和 p2 的 1-3 日，比例按汇总分子/分母重算
    if (card === null) {
      throw new Error('expected attendance trend card data')
    }
    expect(card.tableData.directCount.week1).toBe(80)
    expect(card.tableData.directAttendance.week1).toBe(68)
    expect(card.tableData.directRate.week1).toBe(85)
    expect(card.tableData.targetRate.week1).toBe(93.6)
  })
})
