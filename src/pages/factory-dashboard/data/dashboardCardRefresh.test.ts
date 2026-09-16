import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// 执行页面的实际刷新函数，使用可控 Promise 重现接口乱序返回。
function setup(kind: 'department' | 'process') {
  const source = readFileSync(new URL(`../../${kind}/index.vue`, import.meta.url), 'utf8')
  const start = source.indexOf('async function refreshCard(')
  const end = source.indexOf('\nfunction ', start + 1)
  const script = source.slice(start, end < 0 ? source.indexOf('</script>', start) : end)
  const dashboardData = { value: { changePoint: { status: 'ready' }, productionPlanTrend: { id: 'old' }, productionPlanTrends: [{ id: 'old-productivity' }] } }
  const loaders = {
    loadProductionPlanTrendCard: vi.fn(),
    loadProductivityTrendCards: vi.fn(),
    loadChangePointCard: vi.fn(),
  }
  const context = {
    dashboardData, ...loaders,
    selectedDepartment: { value: 'department4' },
    selectedProcess: { value: 'vulcanization2' },
    selectionConfig: { value: { departmentProcessMap: { department4: ['vulcanization2', 'posttreatment2'] } } },
    isDepartmentCardId: () => true,
    isProcessCardId: () => true,
    handleCardRefreshError: (id: string, error: unknown) => { throw error },
  }
  const compiled = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  const api = new Function(...Object.keys(context), `let dashboardRequestVersion = 1;\n${compiled}\nreturn { refreshCard, switchScope: () => { dashboardRequestVersion += 1 } }`)(...Object.values(context)) as {
    refreshCard: (id: string) => Promise<void>
    switchScope: () => void
  }
  return { ...api, dashboardData, ...loaders }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

for (const kind of ['department', 'process'] as const) {
  describe(`${kind} 三类卡片刷新`, () => {
    it('推移请求晚于变化点返回时，三张卡片均保留最新结果', async () => {
      const page = setup(kind)
      const plan = deferred<{ id: string }>()
      const productivity = deferred<{ id: string }[]>()
      page.loadProductionPlanTrendCard.mockReturnValue(plan.promise)
      page.loadProductivityTrendCards.mockReturnValue(productivity.promise)
      const changePoint = { status: 'ready', allTotal: 9 }
      page.loadChangePointCard.mockResolvedValue(changePoint)
      const planRefresh = page.refreshCard('productionPlanTrend')
      const productivityRefresh = page.refreshCard('productivityTrend')
      await page.refreshCard('changePoint')
      plan.resolve({ id: 'new-plan' })
      await planRefresh
      productivity.resolve([{ id: 'new-productivity' }])
      await productivityRefresh
      expect(page.dashboardData.value).toEqual({ changePoint, productionPlanTrend: { id: 'new-plan' }, productionPlanTrends: [{ id: 'new-productivity' }] })
      expect(page.loadProductionPlanTrendCard.mock.calls[0][2]).toEqual({ forceRefresh: true })
      expect(page.loadProductivityTrendCards.mock.calls[0][3]).toEqual({ forceRefresh: true })
    })

    it.each(['productionPlanTrend', 'productivityTrend', 'changePoint'])('切换维度后忽略旧 %s 响应', async cardId => {
      const page = setup(kind)
      const pending = deferred<unknown>()
      page.loadProductionPlanTrendCard.mockReturnValue(pending.promise)
      page.loadProductivityTrendCards.mockReturnValue(pending.promise)
      page.loadChangePointCard.mockReturnValue(pending.promise)
      const refresh = page.refreshCard(cardId)
      page.switchScope()
      const current = { changePoint: { status: 'ready' }, productionPlanTrend: { id: 'other-scope' }, productionPlanTrends: [] }
      page.dashboardData.value = current
      pending.resolve({ id: 'stale' })
      await refresh
      expect(page.dashboardData.value).toBe(current)
    })
  })
}
