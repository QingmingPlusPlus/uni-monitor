import { describe, expect, it } from 'vitest'
import { getEquipmentDetailData } from './equipmentDetailMock'

describe('getEquipmentDetailData productionPlan', () => {
  it('为设备生产计划表生成已完成、进行中和未开始计划', () => {
    const plan = getEquipmentDetailData(null, '1101').productionPlan

    expect(plan.title).toBe('生产计划实绩')
    expect(plan.rows.filter((row) => row.status === 'completed')).toHaveLength(4)
    expect(plan.rows.filter((row) => row.status === 'active')).toHaveLength(1)
    expect(plan.rows.filter((row) => row.status === 'upcoming')).toHaveLength(2)
  })

  it('按 Excel 口径计算当前计划的可动率、达成率、合格率和实力', () => {
    const activePlan = getEquipmentDetailData(null, '1101').productionPlan.rows
      .find((row) => row.status === 'active')

    expect(activePlan).toMatchObject({
      availabilityRate: 54,
      achievementRate: 108,
      acceptanceRate: 98.14814814814815,
      performanceRate: 50,
      result: 'win',
    })
  })

  it('未开始计划不伪造实绩和比率', () => {
    const upcomingPlan = getEquipmentDetailData(null, '1101').productionPlan.rows
      .find((row) => row.status === 'upcoming')

    expect(upcomingPlan).toMatchObject({
      actual: null,
      availabilityRate: null,
      achievementRate: null,
      acceptanceRate: null,
      result: null,
    })
  })
})
