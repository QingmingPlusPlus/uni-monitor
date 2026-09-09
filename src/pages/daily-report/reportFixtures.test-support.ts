import type { AttendanceReport, DailyReportQuery, LineLossReport, ProductionReport, QualityReport, ReportMetric } from '../../api/dailyReport'

/** 仅供测试导入，业务页面不引入此文件。 */
export const complete = (value: number): ReportMetric => ({ value, status: 'complete' })
export const query: DailyReportQuery = { date: '2026-08-12', department: '1', processType: 'preprocessing' }
export const meta = {
  ...query, reportDate: '2026-08-13', timeZone: 'Asia/Shanghai',
  periodStart: '2026-08-12T06:30:00+08:00', periodEnd: '2026-08-13T06:30:00+08:00',
  updatedAt: '2026-08-13T09:00:00+08:00', status: 'complete' as const, notes: [],
}
export function fixtures() {
  const attendance: AttendanceReport = {
    meta: { ...meta, periodEnd: '2026-08-13T14:30:00+08:00' },
    rows: [{
      id: 'day', date: query.date, shiftCode: 'DAY', shiftName: '早班', isEarlyShift: true,
      startAt: '2026-08-12T06:30:00+08:00', endAt: '2026-08-12T14:30:00+08:00', status: 'complete',
      leaders: [{ employeeId: 'test-leader', name: '测试班长' }], roster: complete(30), actual: complete(28), absent: complete(2),
      absence: { annual: complete(1), care: complete(0), sick: complete(0), personal: complete(1), other: complete(0), unexcused: complete(0) },
    }],
  }
  const production: ProductionReport = { meta: { ...meta }, rows: [{ id: 'clean', name: '洗净', plan: complete(141000), actual: complete(139245), qualified: complete(139045), flowing: complete(138845), defective: complete(200), scrapped: complete(400) }] }
  const lines: LineLossReport = { meta: { ...meta }, rows: [{
    id: 'line-1', name: 'S/Mt-3', plan: complete(2898), actual: complete(2510), availableSeconds: complete(23 * 3600),
    plannedStopSeconds: complete(3600), productionSeconds: complete(19.44 * 3600), lossSeconds: complete(3.56 * 3600),
    reasons: [{ code: 'equipment', name: '设备故障', count: complete(5), durationSeconds: complete(2.12 * 3600) }],
  }] }
  const quality: QualityReport = { meta: { ...meta }, rows: [{
    id: 'TT-189-1-ZJ', name: 'TT-189-1-ZJ', dimension: 'production_number', lines: [{ id: 'line-1', name: 'S/Mt-3' }], productionNumbers: ['TT-189-1-ZJ'],
    actual: complete(1605), qualified: complete(1596), defective: complete(30),
    reasons: [{ code: 'bond', name: '漏粘接', count: complete(27) }, { code: 'fall', name: '落地', count: complete(3) }],
    reasonNote: '各数量独立统计，不建立相加恒等式。',
  }] }
  return { attendance, production, lines, quality }
}
