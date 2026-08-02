import { describe, expect, it } from 'vitest'
import {
  attendanceTrendChartOptions,
  attendanceTrendRows,
} from './attendanceTrendConfig'

describe('attendanceTrendChartOptions', () => {
  it('表格行和图表系列使用计划与实际出勤人数名称', () => {
    expect(attendanceTrendRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'directCount', label: '直接计划出勤人数' }),
      expect.objectContaining({ key: 'directAttendance', label: '直接实际出勤人数' }),
    ]))
    expect(attendanceTrendChartOptions.series).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'directCount', name: '直接计划出勤人数' }),
      expect.objectContaining({ id: 'directAttendance', name: '直接实际出勤人数' }),
    ]))
  })

  it('利计出勤率目标线在图中显示 91% 标注', () => {
    const targetRateSeries = attendanceTrendChartOptions.series?.find((series) => series.id === 'targetRate')

    expect(targetRateSeries?.endLabel).toMatchObject({
      show: true,
      formatter: '91%',
    })
  })
})
