import type { SegmentVO } from '../api/basic'

/** JS getDay() 返回值：0=周日 */
const SUNDAY = 0

/**
 * 计算指定月份的 ISO 自然周分段（周一至周日）。
 *
 * 月首非周一时首段为短周（从 1 号到第一个周日）；
 * 月尾非周日时末段为短周（从最后一个周一到月末）。
 * segmentIndex 从 1 递增。
 *
 * @param year  年份（如 2026）
 * @param month 月份，1-based（1=一月, 12=十二月）
 */
export function computeNaturalWeeks(year: number, month: number): readonly SegmentVO[] {
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const lastDayOfMonth = new Date(year, month, 0).getDate()

  const segments: SegmentVO[] = []
  let segmentIndex = 1
  let currentDay = 1

  // 首段：从 1 号到第一个周日
  // 月首周日(0) → 首段仅 1 天；月首周一(1) → 首段 7 天；月首周六(6) → 首段 2 天
  const firstWeekDays = firstDayOfWeek === SUNDAY ? 1 : 8 - firstDayOfWeek
  const firstWeekEnd = Math.min(firstWeekDays, lastDayOfMonth)
  segments.push({ segmentIndex, startDay: 1, endDay: firstWeekEnd })
  segmentIndex++
  currentDay = firstWeekEnd + 1

  // 后续段：周一至周日，各 7 天，直到月末
  while (currentDay <= lastDayOfMonth) {
    const weekEnd = Math.min(currentDay + 6, lastDayOfMonth)
    segments.push({ segmentIndex, startDay: currentDay, endDay: weekEnd })
    segmentIndex++
    currentDay = weekEnd + 1
  }

  return segments
}
