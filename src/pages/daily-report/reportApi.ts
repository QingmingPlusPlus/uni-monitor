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
  if (result.data?.success !== true || !data || !Array.isArray(data.rows) || !Array.isArray(data.monitorNames) || !data.monitorNames.every(name => typeof name === 'string')) throw new Error('出勤数据不可用')
  const rows: ReportAttendanceRow[] = data.rows.map(row => {
    if (!row || ![query.date, offsetDate(query.date, 1)].includes(row.statDate) || row.reportDate !== offsetDate(query.date, 1) ||
      typeof row.shiftType !== 'string' || !row.shiftType || typeof row.shiftName !== 'string' || !row.shiftName) throw new Error('出勤数据日期或班次无效')
    return { id: `${row.statDate}:${row.shiftType}`, date: row.statDate, shiftCode: row.shiftType, shiftName: row.shiftName,
      // 两日出勤端点明确只返回报告日早班；不通过中文班次名称推测时刻。
      isEarlyShift: row.statDate === offsetDate(query.date, 1), startAt: null, endAt: null, status: 'reported', leaders: null,
      roster: sourceMetric(row.onRollCount), actual: sourceMetric(row.actualAttendanceCount), absent: sourceMetric(row.absenceCount),
      reportedAttendanceRate: sourceMetric(row.attendanceRate, false), absence: {
        annual: sourceMetric(row.annualLeaveCount), care: sourceMetric(row.nursingLeaveCount), sick: sourceMetric(row.sickLeaveCount),
        personal: sourceMetric(row.personalLeaveCount), other: sourceMetric(row.otherLeaveCount), unexcused: sourceMetric(row.absenteeismCount),
      } }
  })
  const report: AttendanceReport = { meta: sourceMeta(query, ['出勤为服务端统计值；未提供班次完成状态和起止时刻，不推算缺勤。', '班长名单属于数据日整体，不分配到单个班次。']),
    rows, monitorNames: data.monitorNames }
  return response(report)
}

export async function getDailyProduction(query: DailyReportQuery, signal?: AbortSignal) {
  const sources = await reportScheduleSources(query, signal)
  if (sources.every(source => source.records === null)) throw new Error('生产数据源均不可用')
  const context = scheduleContext(query, sources)
  return response({ meta: sourceMeta(query, [...context.notes, '按记录日期、部门和已确认工序合计；尚未提供统一的洗净/粘接子作业分类、合格数和流动数。',
    '废弃数按已声明的不良与其他分类相加；没有记录或分类不明时保留缺失。']), rows: productionRows(query, context) })
}

export async function getDailyLineLosses(query: DailyReportQuery, signal?: AbortSignal) {
  const [sources, devices] = await Promise.all([reportScheduleSources(query, signal, false), reportDeviceSource(query, signal)])
  if ([sources[0], sources[1], devices].every(source => source.records === null)) throw new Error('设备生产数据源均不可用')
  const context = scheduleContext(query, sources)
  return response({ meta: { ...sourceMeta(query, [...context.notes, devices.note, '当前按设备展示，未合并为生产线；范围不受地图显示设备限制。',
    '可动率及阻碍占比未说明单位，展示原始数值，不换算百分比；总运转时间不等同于已扣计划停止的可运转时间。']), lineDimension: 'device' as const },
    rows: lineRows(query, context, devices) })
}

export async function getDailyQuality(query: DailyReportQuery, signal?: AbortSignal) {
  const sources = await reportScheduleSources(query, signal)
  if (sources[1].records === null && sources[2].records === null) throw new Error('品质数据源均不可用')
  const context = scheduleContext(query, sources)
  return response({ meta: { ...sourceMeta(query, [...context.notes, '当前按制番展示实绩和可确认归属的不良；未提供模具关联、合格数和不良现象。',
    '没有不良记录不视为不良数为零；缺少完整分子分母时只展示明细，不参与排行。']), qualityDimension: 'production_number' as const }, rows: qualityRows(context) })
}
