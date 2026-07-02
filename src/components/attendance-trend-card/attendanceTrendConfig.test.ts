import { describe, expect, it } from 'vitest'
import { attendanceTrendChartOptions } from './attendanceTrendConfig'

describe('attendanceTrendChartOptions', () => {
  it('利计出勤率目标线在图中显示 91% 标注', () => {
    const targetRateSeries = attendanceTrendChartOptions.series?.find((series) => series.id === 'targetRate')

    expect(targetRateSeries?.endLabel).toMatchObject({
      show: true,
      formatter: '91%',
    })
  })
})
