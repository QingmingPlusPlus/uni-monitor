import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultCssMapSelectionConfig as config } from '../../../../components/css-map/css3dMapSelection'
import { getDepartmentDashboardData, getProcessDashboardData } from '../factoryDashboardMock'
import { createProductionPlanTrendCard } from '../loaders/loadProductionPlanTrendCard'
import { loadProductionPlanTrendCard } from '../loaders/loadProductionActualTrendCard'
import { loadDepartmentDashboardData } from './departmentDashboardLoader'
import { loadProcessDashboardData } from './processDashboardLoader'

vi.mock('../loaders/loadProductionActualTrendCard', () => ({ loadProductionPlanTrendCard: vi.fn() }))
vi.mock('../loaders/loadProductionActivityData', () => ({ loadProductionActivityData: vi.fn().mockRejectedValue(null) }))
vi.mock('../loaders/loadAttendanceCard', () => ({ loadAttendanceCard: vi.fn().mockRejectedValue(null) }))
vi.mock('../loaders/loadAttendanceTrendCard', () => ({ loadAttendanceTrendCard: vi.fn().mockRejectedValue(null) }))
vi.mock('../loaders/loadInboundPlanTrendCard', () => ({ loadInboundPlanTrendCard: vi.fn().mockRejectedValue(null) }))
vi.mock('../loaders/loadPersonnelDetailCard', () => ({ loadPersonnelDetailCard: vi.fn().mockRejectedValue(null) }))
vi.mock('../loaders/createFactorySummaryData', () => ({ createFactorySummaryData: vi.fn().mockRejectedValue(null) }))

describe('真实计划实绩与生产性卡片装配', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it.each(['department', 'process'] as const)('%s 维度独立装配真实表并保留全部生产性卡片', async (kind) => {
    const now = new Date()
    const fixture = createProductionPlanTrendCard('department4', 'vulcanization2')!
    const realCard = { ...fixture, title: '生产计划实绩推移表', id: 'process-production-plan-trend' }
    vi.mocked(loadProductionPlanTrendCard).mockResolvedValue(realCard)

    const fallback = kind === 'department'
      ? getDepartmentDashboardData('department4', config, now, 0)
      : getProcessDashboardData('vulcanization2', config, now, 0)
    const result = fallback.kind === 'department'
      ? await loadDepartmentDashboardData('department4', config, now, 0, fallback)
      : await loadProcessDashboardData('vulcanization2', 'department4', config, now, 0, fallback)

    expect(loadProductionPlanTrendCard).toHaveBeenCalledWith('department4',
      kind === 'department' ? config.departmentProcessMap.department4 : ['vulcanization2'])
    expect(result.productionPlanTrend).toBe(realCard)
    expect(result.productionPlanTrends).toBe(fallback.productionPlanTrends)
    expect(result.productionPlanTrends).toHaveLength(kind === 'department' ? 2 : 1)
    expect(result.productionPlanTrends.every(card => card.title.endsWith('生产性推移表'))).toBe(true)
  })

  it('真实卡片加载失败不影响生产性卡片', async () => {
    vi.mocked(loadProductionPlanTrendCard).mockRejectedValue(new Error('接口失败'))
    const now = new Date()
    const fallback = getDepartmentDashboardData('department4', config, now, 0)
    const result = await loadDepartmentDashboardData('department4', config, now, 0, fallback)
    expect(result.productionPlanTrend).toBeNull()
    expect(result.productionPlanTrends).toBe(fallback.productionPlanTrends)
    expect(result.productionPlanTrends).toHaveLength(2)
  })
})
