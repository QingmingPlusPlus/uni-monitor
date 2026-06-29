import { getMonthSegmentBaseData } from '../api/basic'
import type { MonthSegmentBaseVO, SegmentVO } from '../api/basic'

/** JS getDay() 返回值：0=周日 */
const SUNDAY = 0

/** sessionStorage 键前缀，按月拼后缀：uni-monitor:month-segment:<yyyy-MM> */
const STORAGE_KEY_PREFIX = 'uni-monitor:month-segment:' as const

/** session 中存储的已解析分段记录：processType → 分段数组（配置分段或预存自然周） */
type SegmentRecord = Readonly<Record<string, readonly SegmentVO[]>>

// ---------------------------------------------------------------------------
// 自然周计算
// ---------------------------------------------------------------------------

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
  // 月首周日(0)→1天；周一(1)→7天；周六(6)→2天
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

// ---------------------------------------------------------------------------
// 月份与 session 键工具
// ---------------------------------------------------------------------------

function getCurrentYearMonth(): { readonly year: number; readonly month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function buildMonthKey(year: number, month: number): string {
  return `${STORAGE_KEY_PREFIX}${year}-${String(month).padStart(2, '0')}`
}

function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// 类型守卫（session 读取时解析不可信 JSON）
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSegmentVO(value: unknown): value is SegmentVO {
  if (!isRecord(value)) return false
  return (
    typeof value.segmentIndex === 'number' &&
    typeof value.startDay === 'number' &&
    typeof value.endDay === 'number'
  )
}

function isSegmentRecord(value: unknown): value is SegmentRecord {
  if (!isRecord(value)) return false
  return Object.entries(value).every(
    ([, v]) => Array.isArray(v) && v.every(isSegmentVO),
  )
}

// ---------------------------------------------------------------------------
// session 读写
// ---------------------------------------------------------------------------

function readSessionRecord(monthKey: string): SegmentRecord | null {
  try {
    const raw = window.sessionStorage.getItem(monthKey)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return isSegmentRecord(parsed) ? parsed : null
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[MonthSegment] sessionStorage 读取失败: ${error.message}`)
      return null
    }
    throw error
  }
}

function writeSessionRecord(monthKey: string, record: SegmentRecord): void {
  try {
    window.sessionStorage.setItem(monthKey, JSON.stringify(record))
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[MonthSegment] sessionStorage 写入失败: ${error.message}`)
      return
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// API 响应解析
// ---------------------------------------------------------------------------

/**
 * 将 API 响应解析为已解析的分段记录。
 * segments 非空 → 存储配置分段；segments 为 null/空 → 存储自然周。
 */
function resolveMonthSegmentResponse(
  response: readonly MonthSegmentBaseVO[],
  year: number,
  month: number,
): SegmentRecord {
  const record: Record<string, SegmentVO[]> = {}
  for (const vo of response) {
    if (vo.segments !== null && vo.segments.length > 0) {
      record[vo.processType] = [...vo.segments]
    } else {
      record[vo.processType] = [...computeNaturalWeeks(year, month)]
    }
  }
  return record
}

// ---------------------------------------------------------------------------
// 加载器（fetch + 去重 + 写 session）
// ---------------------------------------------------------------------------

let monthSegmentPromise: Promise<void> | null = null

/**
 * 加载当前月份的分段配置到 sessionStorage。
 *
 * 幂等：同月内重复调用复用同一个 promise（参考 css3dMapSelectionLoader 模式）。
 * session 已有当前月数据时立即返回。
 * 拉取失败时写入空 record {}，所有工序降级为自然周。
 */
export function loadMonthSegmentConfig(): Promise<void> {
  if (monthSegmentPromise !== null) {
    return monthSegmentPromise
  }

  monthSegmentPromise = doLoadMonthSegmentConfig()
  return monthSegmentPromise
}

async function doLoadMonthSegmentConfig(): Promise<void> {
  const { year, month } = getCurrentYearMonth()
  const monthKey = buildMonthKey(year, month)

  // session 已有当前月数据 → 跳过
  const existing = readSessionRecord(monthKey)
  if (existing !== null) {
    return
  }

  try {
    const response = await getMonthSegmentBaseData(formatMonthParam(year, month))
    const record = resolveMonthSegmentResponse(response.data.data, year, month)
    writeSessionRecord(monthKey, record)
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`[MonthSegment] 加载月分段配置失败: ${error.message}`)
      // 写入空 record 标记"已尝试拉取"，所有工序降级为自然周
      writeSessionRecord(monthKey, {})
      return
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// 读取器（同步读 session + 自然周回退）
// ---------------------------------------------------------------------------

/**
 * 获取指定工序的分段配置。
 *
 * - session 键缺失 → 返回 null（API 未返回，消费方应显示加载图标）
 * - session 有键，工序在 record 中 → 返回存储的分段（配置或预存自然周）
 * - session 有键，工序不在 record 中 → 现算自然周返回（视为未配置）
 */
export function getProcessSegments(processType: string): readonly SegmentVO[] | null {
  const { year, month } = getCurrentYearMonth()
  const monthKey = buildMonthKey(year, month)
  const record = readSessionRecord(monthKey)

  if (record === null) {
    return null
  }

  if (Object.hasOwn(record, processType)) {
    return record[processType]
  }

  return computeNaturalWeeks(year, month)
}
