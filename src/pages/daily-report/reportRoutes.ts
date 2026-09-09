import type { ReportProcessType } from '../../api/dailyReport'
import type { CssMapDepartmentValue, CssMapSelectionConfig } from '../../components/css-map/css3dMapTypes'
import { getCssMapDepartmentValue } from '../../components/css-map/css3dMapSelection'
import { toApiProcessType } from '../factory-dashboard/data/loaders/cssMapValueMapping'
import { isReportDate, processOptions, yesterday } from './reportModel'

export interface ReportSelection {
  departmentId: CssMapDepartmentValue
  processType: ReportProcessType
  date: string
}
export function resolveReportSelection(query: Record<string, string | undefined> | undefined, config: CssMapSelectionConfig): ReportSelection {
  const departmentId = getCssMapDepartmentValue(query?.departmentId, config)
  const options = processOptions(departmentId, config)
  const processType = options.find(option => option.value === query?.processType)?.value ?? options[0]?.value ?? 'preprocessing'
  const date = query?.date
  return { departmentId, processType, date: isReportDate(date) ? date : yesterday() }
}
export function buildDailyReportUrl(selection: ReportSelection, from: 'department' | 'process' = 'department', sourceProcessId?: string): string {
  const params = new URLSearchParams({ ...selection, from })
  if (sourceProcessId) params.set('sourceProcessId', sourceProcessId)
  return `/pages/daily-report/index?${params.toString()}`
}
export function reportBackProcess(selection: ReportSelection, config: CssMapSelectionConfig, sourceProcessId?: string) {
  const candidates = config.departmentProcessMap[selection.departmentId].filter(id => toApiProcessType(id) === selection.processType)
  return candidates.find(id => id === sourceProcessId) ?? candidates[0]
}
