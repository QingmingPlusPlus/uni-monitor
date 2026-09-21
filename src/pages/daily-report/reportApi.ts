import type { AttendanceReport, DailyReportQuery, ReportAttendanceRow } from '../../api/dailyReport'
import { getReportAttendanceSource } from '../../api/dailyReport'
import { sourceMeta, sourceMetric, productionRows, qualityRows, scheduleContext, lineRows } from './reportAdapters'
import { reportDeviceSource, reportScheduleSources } from './reportSources'
import { offsetDate } from './reportModel'

function response<T>(data: T) { return { data: { success: true, code: '200', message: '', data } } }

export async function getDailyAttendance(query: DailyReportQuery, signal?: AbortSignal) {
  const result = await getReportAttendanceSource({ dataDate: query.date, reportDate: offsetDate(query.date, 1),
    department: query.department, processType: query.processType }, signal)
  const data = result.data?.data
  if (result.data?.success !== true || !data || !Array.isArray(data.rows)) throw new Error('出勤数据不可用')
  const notes = ['出勤为服务端统计值；未提供班次完成状态和起止时刻，不推算缺勤。', '班长名单属于数据日整体，不分配到单个班次。',
    '缺勤分类保留接口小数原值，折算单位尚未明确。']
  const monitorNames = Array.isArray(data.monitorNames) && data.monitorNames.every(name => typeof name === 'string') ? data.monitorNames : undefined
  if (!monitorNames) notes.push('班长名单未提供或格式异常；直接人员出勤仍正常展示。')
  const candidates = data.rows.filter(row => row && [query.date, offsetDate(query.date, 1)].includes(row.statDate) && row.reportDate === offsetDate(query.date, 1) &&
    typeof row.shiftType === 'string' && !!row.shiftType.trim() && typeof row.shiftName === 'string' && !!row.shiftName.trim())
  const counts = new Map<string, number>()
  for (const row of candidates) {
    const id = `${row.statDate}:${row.shiftType}`
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const unique = candidates.filter(row => counts.get(`${row.statDate}:${row.shiftType}`) === 1)
  if (unique.length < data.rows.length) notes.push('部分出勤记录日期、班次无效或班次重复，已排除；有效班次仍可查看。')
  if (data.rows.length && !unique.length) throw new Error('出勤数据日期或班次无效')
  const rows: ReportAttendanceRow[] = unique.map(row => {
    return { id: `${row.statDate}:${row.shiftType}`, date: row.statDate, shiftCode: row.shiftType, shiftName: row.shiftName,
      // 两日出勤端点明确只返回报告日早班；不通过中文班次名称推测时刻。
      isEarlyShift: row.statDate === offsetDate(query.date, 1), startAt: null, endAt: null, status: 'reported', leaders: null,
      roster: sourceMetric(row.onRollCount), actual: sourceMetric(row.actualAttendanceCount), absent: sourceMetric(row.absenceCount),
      reportedAttendanceRate: sourceMetric(row.attendanceRate, false), absence: {
        annual: sourceMetric(row.annualLeaveCount, false), care: sourceMetric(row.nursingLeaveCount, false), sick: sourceMetric(row.sickLeaveCount, false),
        personal: sourceMetric(row.personalLeaveCount, false), other: sourceMetric(row.otherLeaveCount, false), unexcused: sourceMetric(row.absenteeismCount, false),
      } }
  })
  const report: AttendanceReport = { meta: sourceMeta(query, notes), rows, monitorNames }
  return response(report)
}

export async function getDailyProduction(query: DailyReportQuery, signal?: AbortSignal) {
  const sources = await reportScheduleSources(query, signal)
  if (sources.every(source => source.records === null)) throw new Error('生产数据源均不可用')
  const context = scheduleContext(query, sources, true)
  const rows = productionRows(context)
  return response({ meta: sourceMeta(query, [...context.notes, '按记录日期、部门和工序筛选后按制番合计；流动数取实绩接口，实绩数为流动加废弃，合格数为流动加非不良。',
    '废弃数包含不良接口全部类型；不良来源成功且范围完整时，无记录按零处理。']), rows })
}

export async function getDailyLineLosses(query: DailyReportQuery, signal?: AbortSignal) {
  const [sources, devices] = await Promise.all([reportScheduleSources(query, signal), reportDeviceSource(query, signal)])
  if ([...sources, devices].every(source => source.records === null)) throw new Error('产线生产数据源均不可用')
  const context = scheduleContext(query, sources, true)
  const rows = lineRows(query, context, devices)
  return response({ meta: { ...sourceMeta(query, [...context.notes, devices.note, '设备即产线，按设备编码统计，实绩数包含废弃；范围不受地图显示设备限制。',
    '可动率及阻碍占比直接显示接口原值；计划停止时间暂不展示。']), lineDimension: 'line' as const },
    rows })
}

export async function getDailyQuality(query: DailyReportQuery, signal?: AbortSignal) {
  const [sources, devices] = await Promise.all([reportScheduleSources(query, signal), reportDeviceSource(query, signal)])
  if (sources[1].records === null && sources[2].records === null) throw new Error('品质数据源均不可用')
  const context = scheduleContext(query, sources, true)
  const rows = qualityRows(query, context, devices)
  return response({ meta: { ...sourceMeta(query, [...context.notes,
    devices.note ? `产线名称来源不可用，使用设备编码：${devices.note}` : '',
    '品质与生产使用相同数量公式：实绩包含全部废弃，合格包含明确非不良；不良成功且范围完整时无记录按零。',
    '设备即产线，名称缺失回退编码；按制番展示，未提供模具关联及不良现象明细。']), qualityDimension: 'production_number' as const }, rows })
}
