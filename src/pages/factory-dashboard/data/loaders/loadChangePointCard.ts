import { getScheduleChangePoint } from '../../../../api/schedule'
import type { ScheduleChangePointRecord } from '../../../../api/schedule'
import type { SegmentVO } from '../../../../api/basic'
import type { CssMapDepartmentValue, CssMapProcessValue } from '../../../../components/css-map/css3dMapTypes'
import { computeNaturalWeeks, getProcessSegments } from '../../../../utils/monthSegment'
import { toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'

export const changePointCategories = [
  { type: '人', label: '人员', color: '#2471FF' },
  { type: '机', label: '设备', color: '#E55353' },
  { type: '料', label: '材料', color: '#22A06B' },
  { type: '法', label: '方法', color: '#F5B638' },
  { type: '环', label: '环境', color: '#53657A' },
  { type: '模具', label: '模具', color: '#8A9BAE' },
] as const

export interface ChangePointRow {
  readonly label: string
  readonly color: string
  readonly days: readonly (number | null)[]
  readonly total: number | null
  /** 当前维度接口返回的全部记录件数，不受周/月筛选影响。 */
  readonly allTotal: number | null
}
export interface ChangePointData {
  readonly month: string
  readonly days: readonly number[]
  readonly rows: readonly ChangePointRow[]
  readonly weekDays: readonly number[]
  readonly weekRows: readonly ChangePointRow[]
  readonly status: 'loading' | 'ready' | 'error'
  readonly message: string
}

const processLabels: Record<CssMapProcessValue, string> = {
  pretreatment1: '前处理1', pretreatment2: '前处理2',
  vulcanization1: '加硫', vulcanization2: '加硫',
  posttreatment1: '后处理', posttreatment2: '后处理',
}

/** 优先配置中包含当天的周；缺失或无效时回退月内周一至周日自然周。 */
export function resolveChangePointWeek(now: Date, segments: readonly SegmentVO[] | null): readonly number[] {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const valid = (segment: SegmentVO) => Number.isInteger(segment.startDay) && Number.isInteger(segment.endDay)
    && segment.startDay >= 1 && segment.endDay <= lastDay
    && segment.startDay <= now.getDate() && segment.endDay >= now.getDate()
  const segment = segments?.find(valid)
    ?? computeNaturalWeeks(now.getFullYear(), now.getMonth() + 1).find(valid)!
  return Array.from({ length: segment.endDay - segment.startDay + 1 }, (_, i) => segment.startDay + i)
}

export function createEmptyChangePointData(now = new Date(), status: ChangePointData['status'] = 'loading', message = ''): ChangePointData {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const days = Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, i) => i + 1)
  const weekDays = resolveChangePointWeek(now, null)
  const emptyRows = (dates: readonly number[]) => changePointCategories.map(category => ({
    ...category, days: dates.map(() => null), total: null, allTotal: null,
  }))
  return { month, days, weekDays, status, message, rows: emptyRows(days), weekRows: emptyRows(weekDays) }
}

export interface ChangePointSource {
  readonly scope: string
  readonly all: readonly ScheduleChangePointRecord[]
  readonly weekDays?: readonly number[]
}

/** pid 暂按科室+工序范围内唯一处理；不按设备筛选，保留非设备变化点。 */
export function aggregateChangePoints(sources: readonly ChangePointSource[], now = new Date()): ChangePointData {
  const empty = createEmptyChangePointData(now)
  const weekDays = [...new Set(sources.flatMap(source => source.weekDays ?? empty.weekDays))].sort((a, b) => a - b)
  const counts: (number | null)[][] = changePointCategories.map(() => empty.days.map(day => day <= now.getDate() ? 0 : null))
  const weekCounts: (number | null)[][] = changePointCategories.map(() => weekDays.map(day => day <= now.getDate() ? 0 : null))
  const allCounts = changePointCategories.map(() => 0)
  const seen = new Map<string, string>()
  for (const source of sources) {
    const sourceWeek = source.weekDays ?? empty.weekDays
    for (const record of source.all) {
      const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(record.date ?? '')
      if (!match) throw new Error('变化点日期缺失或格式不支持，无法完整统计')
      const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
      if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) throw new Error('变化点日期无效')
      const index = changePointCategories.findIndex(category => category.type === record.type)
      const pid = String(record.pid ?? '').trim()
      if (index < 0 || !pid) throw new Error('变化点类别或序号不完整，无法可靠统计')
      const key = `${source.scope}:${pid}`
      const signature = `${match[1]}-${match[2]}-${match[3]}:${index}`
      if (seen.has(key)) {
        if (seen.get(key) !== signature) throw new Error('变化点序号存在冲突，无法可靠去重')
        continue
      }
      seen.set(key, signature)
      allCounts[index] += 1
      if (`${match[1]}-${match[2]}` !== empty.month || day > now.getDate()) continue
      counts[index][day - 1] = (counts[index][day - 1] ?? 0) + 1
      if (sourceWeek.includes(day)) {
        const weekIndex = weekDays.indexOf(day)
        weekCounts[index][weekIndex] = (weekCounts[index][weekIndex] ?? 0) + 1
      }
    }
  }
  const rows = (values: (number | null)[][]) => changePointCategories.map((category, index) => ({
    ...category, days: values[index],
    total: values[index].reduce<number>((sum, count) => sum + (count ?? 0), 0),
    allTotal: allCounts[index],
  }))
  return { ...empty, weekDays, status: 'ready', rows: rows(counts), weekRows: rows(weekCounts) }
}

export async function loadChangePointCard(department: CssMapDepartmentValue, processes: readonly CssMapProcessValue[], now = new Date()): Promise<ChangePointData> {
  try {
    if (!processes.length) throw new Error('当前范围未配置工序')
    const dept = toApiDepartmentCode(department)
    const sources = await Promise.all([...new Set(processes)].map(async process => {
      const response = await getScheduleChangePoint({ dept, process: processLabels[process], progress: '' })
      if (!response.data.success || !Array.isArray(response.data.data)) throw new Error('变化点接口未返回有效数据')
      const segments = typeof window === 'undefined' ? null : getProcessSegments(dept, toApiProcessType(process))
      return {
        scope: `${dept}:${processLabels[process]}`, all: response.data.data,
        weekDays: resolveChangePointWeek(now, segments),
      }
    }))
    return aggregateChangePoints(sources, now)
  } catch (error) {
    return createEmptyChangePointData(now, 'error', error instanceof Error ? error.message : '变化点加载失败，请重试')
  }
}
