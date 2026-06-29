import { describe, it, expect } from 'vitest'
import { computeNaturalWeeks } from './monthSegment'
import type { SegmentVO } from '../api/basic'

/**
 * 验证分段数组覆盖整个月、无重叠、无间隙，segmentIndex 连续。
 */
function assertSegmentsContiguous(
  result: readonly SegmentVO[],
  expectedLastDay: number,
): void {
  expect(result.length).toBeGreaterThan(0)

  // 首段必须从 1 号开始
  expect(result[0]?.startDay).toBe(1)

  // segmentIndex 从 1 连续递增
  result.forEach((seg, i) => {
    expect(seg.segmentIndex).toBe(i + 1)
  })

  // 相邻段首尾相接
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1]
    const curr = result[i]
    expect(curr?.startDay).toBe((prev?.endDay ?? 0) + 1)
  }

  // 末段必须结束在当月最后一天
  expect(result[result.length - 1]?.endDay).toBe(expectedLastDay)
}

describe('computeNaturalWeeks', () => {
  describe('月首为周一时（首段满 7 天）', () => {
    it('2026-06: 30 天，月首周一，月尾周二 → 5 段', () => {
      // Given: 2026 年 6 月，1 号周一，30 天，30 号周二
      // When: 计算自然周
      const result = computeNaturalWeeks(2026, 6)
      // Then: 5 段，首段 1-7，末段 29-30
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 7 },
        { segmentIndex: 2, startDay: 8, endDay: 14 },
        { segmentIndex: 3, startDay: 15, endDay: 21 },
        { segmentIndex: 4, startDay: 22, endDay: 28 },
        { segmentIndex: 5, startDay: 29, endDay: 30 },
      ])
      assertSegmentsContiguous(result, 30)
    })

    it('2027-02: 28 天非闰年，月首周一，月尾周日 → 4 段全满', () => {
      // Given: 2027 年 2 月，28 天（非闰年），1 号周一，28 号周日
      // When: 计算自然周
      const result = computeNaturalWeeks(2027, 2)
      // Then: 恰好 4 段，每段 7 天
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 7 },
        { segmentIndex: 2, startDay: 8, endDay: 14 },
        { segmentIndex: 3, startDay: 15, endDay: 21 },
        { segmentIndex: 4, startDay: 22, endDay: 28 },
      ])
      assertSegmentsContiguous(result, 28)
    })
  })

  describe('月首为周五时（首段 3 天）', () => {
    it('2026-05: 31 天，月首周五，月尾周日 → 5 段，末段满 7 天', () => {
      // Given: 2026 年 5 月，1 号周五，31 天，31 号周日
      // When: 计算自然周
      const result = computeNaturalWeeks(2026, 5)
      // Then: 首段 1-3（周五至周日），末段 25-31（周一至周日）
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 3 },
        { segmentIndex: 2, startDay: 4, endDay: 10 },
        { segmentIndex: 3, startDay: 11, endDay: 17 },
        { segmentIndex: 4, startDay: 18, endDay: 24 },
        { segmentIndex: 5, startDay: 25, endDay: 31 },
      ])
      assertSegmentsContiguous(result, 31)
    })
  })

  describe('月首为周六时（首段 2 天）', () => {
    it('2026-08: 31 天，月首周六，月尾周一 → 6 段，末段仅 1 天', () => {
      // Given: 2026 年 8 月，1 号周六，31 天，31 号周一
      // When: 计算自然周
      const result = computeNaturalWeeks(2026, 8)
      // Then: 首段 1-2，末段 31-31（仅 1 天）
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 2 },
        { segmentIndex: 2, startDay: 3, endDay: 9 },
        { segmentIndex: 3, startDay: 10, endDay: 16 },
        { segmentIndex: 4, startDay: 17, endDay: 23 },
        { segmentIndex: 5, startDay: 24, endDay: 30 },
        { segmentIndex: 6, startDay: 31, endDay: 31 },
      ])
      assertSegmentsContiguous(result, 31)
    })
  })

  describe('月首为周日时（首段仅 1 天）', () => {
    it('2026-02: 28 天非闰年，月首周日，月尾周六 → 5 段，首段仅 1 天', () => {
      // Given: 2026 年 2 月，28 天（非闰年），1 号周日，28 号周六
      // When: 计算自然周
      const result = computeNaturalWeeks(2026, 2)
      // Then: 首段 1-1（仅周日），末段 23-28（周一至周六）
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 1 },
        { segmentIndex: 2, startDay: 2, endDay: 8 },
        { segmentIndex: 3, startDay: 9, endDay: 15 },
        { segmentIndex: 4, startDay: 16, endDay: 22 },
        { segmentIndex: 5, startDay: 23, endDay: 28 },
      ])
      assertSegmentsContiguous(result, 28)
    })

    it('2026-03: 31 天，月首周日，月尾周二 → 6 段', () => {
      // Given: 2026 年 3 月，1 号周日，31 天，31 号周二
      // When: 计算自然周
      const result = computeNaturalWeeks(2026, 3)
      // Then: 首段 1-1，末段 30-31
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 1 },
        { segmentIndex: 2, startDay: 2, endDay: 8 },
        { segmentIndex: 3, startDay: 9, endDay: 15 },
        { segmentIndex: 4, startDay: 16, endDay: 22 },
        { segmentIndex: 5, startDay: 23, endDay: 29 },
        { segmentIndex: 6, startDay: 30, endDay: 31 },
      ])
      assertSegmentsContiguous(result, 31)
    })
  })

  describe('月首为周四时（首段 4 天）', () => {
    it('2026-01: 31 天，月首周四，月尾周六 → 5 段', () => {
      // Given: 2026 年 1 月，1 号周四，31 天，31 号周六
      // When: 计算自然周
      const result = computeNaturalWeeks(2026, 1)
      // Then: 首段 1-4（周四至周日），末段 26-31（周一至周六）
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 4 },
        { segmentIndex: 2, startDay: 5, endDay: 11 },
        { segmentIndex: 3, startDay: 12, endDay: 18 },
        { segmentIndex: 4, startDay: 19, endDay: 25 },
        { segmentIndex: 5, startDay: 26, endDay: 31 },
      ])
      assertSegmentsContiguous(result, 31)
    })
  })

  describe('闰年 2 月', () => {
    it('2024-02: 29 天闰年，月首周四，月尾周四 → 5 段', () => {
      // Given: 2024 年 2 月，29 天（闰年），1 号周四，29 号周四
      // When: 计算自然周
      const result = computeNaturalWeeks(2024, 2)
      // Then: 首段 1-4，末段 26-29
      expect(result).toEqual([
        { segmentIndex: 1, startDay: 1, endDay: 4 },
        { segmentIndex: 2, startDay: 5, endDay: 11 },
        { segmentIndex: 3, startDay: 12, endDay: 18 },
        { segmentIndex: 4, startDay: 19, endDay: 25 },
        { segmentIndex: 5, startDay: 26, endDay: 29 },
      ])
      assertSegmentsContiguous(result, 29)
    })
  })

  describe('2026 全年 12 个月连续性校验', () => {
    const expectedLastDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    for (let month = 1; month <= 12; month++) {
      const expectedLastDay = expectedLastDays[month - 1]
      it(`2026-${String(month).padStart(2, '0')}: ${expectedLastDay} 天，分段连续无间隙`, () => {
        const result = computeNaturalWeeks(2026, month)
        assertSegmentsContiguous(result, expectedLastDay)
      })
    }
  })
})
