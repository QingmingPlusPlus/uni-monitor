import type { SegmentVO } from '../api/basic'
import type { TableColumnConfig } from '../components/table-chart-card/TableChartCard.types'

export interface DepartmentTrendDailyRow {
  readonly processType: string
  readonly day: number
}

export type SegmentLookup = (processType: string) => readonly SegmentVO[] | null

export function createWeekKey(segmentIndex: number): string {
  return `week${segmentIndex}`
}

export function createWeekColumns(maxSegmentIndex: number): readonly TableColumnConfig[] {
  return Array.from({ length: maxSegmentIndex }, (_, index) => {
    const segmentIndex = index + 1

    return {
      key: createWeekKey(segmentIndex),
      label: `${segmentIndex}W`,
    }
  })
}

export function resolveProcessSegments(
  processTypes: readonly string[],
  segmentLookup: SegmentLookup,
): readonly (readonly SegmentVO[])[] | null {
  const segmentGroups: (readonly SegmentVO[])[] = []

  for (const processType of processTypes) {
    const segments = segmentLookup(processType)
    if (segments === null) {
      return null
    }

    segmentGroups.push(segments)
  }

  return segmentGroups
}

export function getMaxSegmentIndex(segmentGroups: readonly (readonly SegmentVO[])[]): number {
  return segmentGroups.reduce((maxSegmentIndex, segments) => {
    const processMax = segments.reduce(
      (max, segment) => Math.max(max, segment.segmentIndex),
      0,
    )

    return Math.max(maxSegmentIndex, processMax)
  }, 0)
}

export function getRowsInSegment<TDailyRow extends DepartmentTrendDailyRow>(
  dailyRows: readonly TDailyRow[],
  processType: string,
  segment: SegmentVO,
): readonly TDailyRow[] {
  return dailyRows.filter(
    (row) =>
      row.processType === processType &&
      row.day >= segment.startDay &&
      row.day <= segment.endDay,
  )
}
