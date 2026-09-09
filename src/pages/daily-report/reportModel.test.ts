import { describe, expect, it } from 'vitest'
import { defaultCssMapSelectionConfig as config } from '../../components/css-map/css3dMapSelection'
import { absenceTotal, attendanceIssues, attendanceRate, attendanceRows, formatMetric, isReportDate, offsetDate, percent, processOptions, rankLines, rankQuality } from './reportModel'
import { buildDailyReportUrl, reportBackProcess, resolveReportSelection } from './reportRoutes'
import { complete, fixtures } from './reportFixtures.test-support'
import { hasIncompleteRows, validAttendance, validLines, validProduction, validQuality, validReportMeta } from './reportValidation'

describe('日报筛选与日期', () => {
  it('同部门工序族去重，制造4课保留两个有效族', () => {
    expect(processOptions('department1', config)).toEqual([{ value: 'preprocessing', label: '前处理' }])
    expect(processOptions('department4', config).map(item => item.value)).toEqual(['sulfur_addition', 'post_processing'])
  })
  it('校验真实日期并跨月、跨年与闰日', () => {
    expect(isReportDate('2026-02-29')).toBe(false)
    expect(isReportDate('2024-02-29')).toBe(true)
    expect(offsetDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(offsetDate('2026-08-31', 1)).toBe('2026-09-01')
  })
  it('URL恢复、非法工序回退和返回原始工序', () => {
    const selection = resolveReportSelection({ departmentId: 'department4', processType: 'post_processing', date: '2026-08-12' }, config)
    const url = buildDailyReportUrl(selection, 'process', 'posttreatment2')
    const restored: Record<string, string> = {}
    new URLSearchParams(url.split('?')[1]).forEach((value, key) => { restored[key] = value })
    expect(resolveReportSelection(restored, config)).toEqual(selection)
    expect(reportBackProcess(selection, config, restored.sourceProcessId)).toBe('posttreatment2')
    expect(resolveReportSelection({ departmentId: 'department1', processType: 'sulfur_addition' }, config).processType).toBe('preprocessing')
  })
})
describe('日报计算与数据完整性', () => {
  it('时间可动率不重复扣计划停止；数量独立、不强制相加', () => {
    const { attendance, lines, quality } = fixtures()
    expect(attendanceRate(attendance.rows[0])).toBe('93.3%')
    expect(percent(lines.rows[0].productionSeconds, lines.rows[0].availableSeconds, 1)).toBe('84.5%')
    expect(percent(quality.rows[0].defective, quality.rows[0].actual)).toBe('1.87%')
    expect(percent(quality.rows[0].reasons![0].count, quality.rows[0].actual)).toBe('1.68%')
    expect(formatMetric(lines.rows[0].productionSeconds, true)).toBe('19.44')
  })
  it('真实零值、未接入、未完成与非法分母区别处理', () => {
    expect(formatMetric(complete(0))).toBe('0')
    expect(formatMetric(undefined)).toBe('—')
    expect(percent(complete(0), complete(100))).toBe('0.00%')
    expect(percent(complete(1), complete(0))).toBe('—')
    expect(percent({ value: 10, status: 'partial' }, complete(30))).toBe('—')
    expect(percent(complete(NaN), complete(30))).toBe('—')
  })
  it('不把未开始或统计中的班次算为缺勤；只在人数完整时推算总数', () => {
    const row = fixtures().attendance.rows[0]
    expect(absenceTotal({ ...row, status: 'not_started' })).toBeUndefined()
    expect(absenceTotal({ ...row, status: 'in_progress' })).toBeUndefined()
    expect(attendanceRate({ ...row, status: 'not_started' })).toBe('—')
    expect(absenceTotal({ ...row, absent: { value: null, status: 'unavailable' } })).toEqual(complete(2))
  })
  it('数据日保留各种班次，次日只保留后端标记的早班', () => {
    const row = fixtures().attendance.rows[0]
    const rows = [row, { ...row, id: 'mid', isEarlyShift: false }, { ...row, id: 'next', date: '2026-08-13' }, { ...row, id: 'excluded', date: '2026-08-13', isEarlyShift: false }]
    expect(attendanceRows(rows, '2026-08-12').map(row => row.id)).toEqual(['day', 'mid', 'next'])
  })
  it('排行限制阈值和数量，稳定排序且不补造数据', () => {
    const line = fixtures().lines.rows[0]
    const rows = ['c', 'b', 'a', 'd'].map(id => ({ ...line, id }))
    rows.push({ ...line, id: 'zero', plan: complete(0) }, { ...line, id: '90', plan: complete(100), actual: complete(90) })
    expect(rankLines(rows).map(row => row.id)).toEqual(['a', 'b', 'c'])
    expect(rankLines([])).toEqual([])
    const quality = fixtures().quality.rows[0]
    expect(rankQuality([quality], 'sulfur_addition')).toEqual([])
    expect(rankQuality([{ ...quality, dimension: 'mold' }], 'sulfur_addition')).toHaveLength(1)
    expect(rankQuality([{ ...quality, defective: complete(0) }], 'preprocessing')).toEqual([])
  })
  it('拒绝结构、重复排行键、错误品质维度和越界出勤', () => {
    const f = fixtures()
    expect(validAttendance(f.attendance.rows, f.attendance.meta)).toBe(true)
    expect(validProduction(f.production.rows)).toBe(true)
    expect(validLines(f.lines.rows)).toBe(true)
    expect(validQuality(f.quality.rows, f.quality.meta)).toBe(true)
    expect(validLines([...f.lines.rows, ...f.lines.rows])).toBe(false)
    expect(validQuality(f.quality.rows, { ...f.quality.meta, processType: 'sulfur_addition' })).toBe(false)
    expect(validAttendance([{ ...f.attendance.rows[0], date: '2026-08-14' }], f.attendance.meta)).toBe(false)
  })
  it('缺勤分类差异和缺失指标不会标为完整，零值仍然完整', () => {
    const f = fixtures()
    expect(hasIncompleteRows(f.production.rows)).toBe(false)
    expect(hasIncompleteRows([{ ...f.production.rows[0], flowing: { value: null, status: 'unavailable' } }])).toBe(true)
    const row = f.attendance.rows[0]
    const inconsistent = { ...row, absent: complete(3) }
    expect(attendanceIssues(inconsistent)).toHaveLength(1)
    expect(hasIncompleteRows([inconsistent])).toBe(true)
    expect(hasIncompleteRows([{ ...row, status: 'not_started' }])).toBe(true)
    expect(validProduction([{ ...f.production.rows[0], actual: complete(0.5) }])).toBe(false)
  })
  it('统计时间必须带偏移和有效工厂时区', () => {
    const { meta } = fixtures().production
    expect(validReportMeta(meta, meta)).toBe(true)
    expect(validReportMeta({ ...meta, timeZone: 'unknown/factory' }, meta)).toBe(false)
    expect(validReportMeta({ ...meta, periodStart: '2026-08-12T06:30:00' }, meta)).toBe(false)
  })
})
