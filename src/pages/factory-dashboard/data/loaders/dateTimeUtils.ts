import type { PersonnelAttendanceShift } from '../factoryDashboardTypes'

const refreshedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dayShiftStartMinutes = 6 * 60 + 30
const middleShiftStartMinutes = 14 * 60 + 30
const nightShiftStartMinutes = 22 * 60 + 30

export type ActiveAttendanceShift = Exclude<PersonnelAttendanceShift, 'regular' | 'total'>

export interface CurrentShiftCutoff {
  readonly dateKey: number
  readonly shift: ActiveAttendanceShift
}

export function getCurrentMonthParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getCurrentDateParam(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getCurrentMonthNumber(): number {
  return new Date().getMonth() + 1
}

export function getCurrentDayOfMonth(): number {
  return new Date().getDate()
}

export function getLastDayOfCurrentMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

export function isWeekendDayOfCurrentMonth(day: number): boolean {
  const now = new Date()
  const dayOfWeek = new Date(now.getFullYear(), now.getMonth(), day).getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

export function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function getCurrentAttendanceShift(now = new Date()): ActiveAttendanceShift {
  const minutes = getMinutesSinceMidnight(now)

  if (minutes >= dayShiftStartMinutes && minutes < middleShiftStartMinutes) return 'day'
  if (minutes >= middleShiftStartMinutes && minutes < nightShiftStartMinutes) return 'middle'
  return 'night'
}

export function toLocalDateKey(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate()
}

export function extractLocalDateKey(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/u.exec(dateStr.trim())
  if (match === null) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null
  return year * 10_000 + month * 100 + day
}

export function getCurrentShiftCutoff(now = new Date()): CurrentShiftCutoff {
  const businessDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (getMinutesSinceMidnight(now) < dayShiftStartMinutes) {
    businessDate.setDate(businessDate.getDate() - 1)
  }

  return {
    dateKey: toLocalDateKey(businessDate),
    shift: getCurrentAttendanceShift(now),
  }
}

export function isDateAtOrBeforeShiftCutoff(
  dateStr: string,
  cutoff: CurrentShiftCutoff,
): boolean {
  const dateKey = extractLocalDateKey(dateStr)
  return dateKey === null || dateKey <= cutoff.dateKey
}

export function getShiftSequence(shift: ActiveAttendanceShift): number {
  if (shift === 'day') return 0
  if (shift === 'middle') return 1
  return 2
}

export function extractDayFromDate(dateStr: string): number {
  const parts = dateStr.split('-')
  return parts.length >= 3 ? Number(parts[2]) : 1
}

export function formatRefreshedAt(date: Date): string {
  return refreshedAtFormatter.format(date)
}
