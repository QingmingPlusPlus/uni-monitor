import type { CurrentAttendanceStatisticsVO } from '../../../../api/attendance'
import type { PersonnelAttendanceShift } from '../factoryDashboardTypes'

export type ApiPositionType = 'direct' | 'indirect'

export function mapShiftType(shiftType: string): PersonnelAttendanceShift {
  const text = shiftType.toLowerCase()
  if (text.includes('夜') || text.includes('晚') || text.includes('night') || text.includes('late')) return 'night'
  if (text.includes('中') || text.includes('middle') || text.includes('mid')) return 'middle'
  if (text.includes('早') || text.includes('白') || text.includes('early') || text.includes('day')) return 'day'
  return 'regular'
}

export function voShiftLabel(shiftType: string): string {
  const text = shiftType.toLowerCase()
  if (text.includes('夜') || text.includes('晚') || text.includes('night') || text.includes('late')) return '晚班'
  if (text.includes('中') || text.includes('middle') || text.includes('mid')) return '中班'
  if (text.includes('早') || text.includes('白') || text.includes('early') || text.includes('day')) return '早班'
  return shiftType || '正常班'
}

export function getAttendanceShiftText(vo: CurrentAttendanceStatisticsVO): string {
  return vo.shiftTypeName || vo.shiftType || ''
}

export function isPositionType(position: CurrentAttendanceStatisticsVO, type: ApiPositionType): boolean {
  return (position.positionType as ApiPositionType) === type
}

export function isClassLeaderPosition(position: CurrentAttendanceStatisticsVO): boolean {
  return (position.positionName ?? '').includes('班长')
}

export function isDirectGroupLeader(positionName: string): boolean {
  return positionName.includes('组长')
}

export function extractDayFromDate(dateStr: string): number {
  const parts = dateStr.split('-')
  return parts.length >= 3 ? Number(parts[2]) : 1
}

export function getScheduleShiftSequence(value: string | null | undefined): number | null {
  const text = String(value ?? '').trim()
  const shift = mapShiftType(text)
  if (shift === 'day' || shift === 'middle' || shift === 'night') {
    return { day: 0, middle: 1, night: 2 }[shift]
  }

  const normalized = text.toLowerCase()
  if (
    normalized.includes('正常') ||
    normalized.includes('常日') ||
    normalized.includes('regular') ||
    normalized.includes('normal')
  ) {
    return 0
  }
  return null
}
