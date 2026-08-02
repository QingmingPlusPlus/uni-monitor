export function sumBy<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0)
}

export function averageBy<T>(items: readonly T[], selector: (item: T) => number): number | null {
  if (items.length === 0) return null
  return items.reduce((total, item) => total + selector(item), 0) / items.length
}

export function formatInteger(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

export function formatOneDecimalPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)}%`
}

export function formatRatioValue(actual: number | null | undefined, plan: number | null | undefined): string {
  if (typeof actual !== 'number' || typeof plan !== 'number') return '-'
  return `${formatInteger(actual)}/${formatInteger(plan)}`
}

export function calculateRate(actual: number | null | undefined, plan: number | null | undefined): number | null {
  if (typeof actual !== 'number' || typeof plan !== 'number' || plan === 0) return null
  return Number(((actual / plan) * 100).toFixed(1))
}

export function calculateAttendanceRate(rosterTotal: number, actualAttendance: number): number | null {
  if (rosterTotal === 0) return null
  return Number(((actualAttendance / rosterTotal) * 100).toFixed(1))
}
