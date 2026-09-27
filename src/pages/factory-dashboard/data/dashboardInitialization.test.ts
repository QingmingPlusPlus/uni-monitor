import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { computed, effectScope, nextTick, ref, shallowRef, watch } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { buildDepartmentUrl, buildProcessUrl, buildEquipmentUrl } from '../utils/factoryRoutes'

function deferred() {
  let resolve!: (value?: unknown) => void
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

for (const kind of ['department', 'process'] as const) {
  describe(`${kind} 初始化`, () => {
    it.each(['screen', 'pc'] as const)('%s 配置就绪后只请求目标维度一次，导航保留当前端', async terminal => {
      const file = readFileSync(new URL(`../composables/use${kind[0].toUpperCase() + kind.slice(1)}Dashboard.ts`, import.meta.url), 'utf8')
      const script = file
      const parsed = ts.createSourceFile('page.ts', script, ts.ScriptTarget.Latest, true)
      const context: Record<string, unknown> = {}
      for (const statement of parsed.statements) {
        if (!ts.isImportDeclaration(statement)) continue
        const clause = statement.importClause
        if (clause?.name) context[clause.name.text] = vi.fn()
        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const item of clause.namedBindings.elements) context[item.name.text] = vi.fn()
        }
      }
      const selection = deferred(), segments = deferred()
      const mounted: (() => void)[] = [], unmounted: (() => void)[] = []
      const query = { departmentId: 'department4', processId: 'posttreatment2' }
      const config = { departmentProcessMap: { department4: ['vulcanization2', 'posttreatment2'] } }
      const fallback = { changePoint: { status: 'loading' } }
      const loadChangePointCard = vi.fn().mockResolvedValue({ status: 'ready' })
      Object.assign(context, {
        computed, ref, shallowRef, watch, terminal,
        buildDepartmentUrl, buildProcessUrl, buildEquipmentUrl,
        onLoad: (fn: (q: unknown) => void) => fn(query),
        onMounted: (fn: () => void) => mounted.push(fn),
        onBeforeUnmount: (fn: () => void) => unmounted.push(fn),
        defaultCssMapSelectionValues: { department: 'department1', process: 'pretreatment1' },
        defaultCssMapSelectionConfig: config,
        readQueryValue: (q: Record<string, string>, key: string) => q[key],
        readCurrentFactoryRouteQuery: () => query,
        getCssMapDepartmentValue: (value: string) => value,
        getCssMapProcessValue: (value: string) => value,
        getCssMapDepartmentForProcess: (value: string) => value === 'posttreatment2' ? 'department4' : 'department1',
        getDepartmentDashboardData: () => fallback,
        getProcessDashboardData: () => fallback,
        loadDepartmentDashboardData: vi.fn().mockResolvedValue(fallback),
        loadProcessDashboardData: vi.fn().mockResolvedValue(fallback),
        loadCssMapSelectionConfig: () => selection.promise,
        loadMonthSegmentConfig: () => segments.promise,
        loadChangePointCard,
      })
      const setup = parsed.statements.find(ts.isFunctionDeclaration)!
      const body = setup.body!.statements.map(s => s.getText(parsed)).join('\n')
      const compiled = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
      const scope = effectScope()
      try {
        const page = scope.run(() => new Function(...Object.keys(context), compiled)(...Object.values(context)))
        mounted.forEach(fn => fn())
        await nextTick()
        expect(loadChangePointCard).not.toHaveBeenCalled()
        selection.resolve(config)
        await nextTick()
        expect(loadChangePointCard).not.toHaveBeenCalled()
        segments.resolve()
        for (let i = 0; i < 12; i++) await nextTick()
        expect(loadChangePointCard).toHaveBeenCalledTimes(1)
        expect(loadChangePointCard.mock.calls[0][0]).toBe('department4')
        expect(loadChangePointCard.mock.calls[0][1]).toEqual(kind === 'process' ? ['posttreatment2'] : ['vulcanization2', 'posttreatment2'])
        const root = terminal === 'pc' ? '/pages-pc' : '/pages'
        page.clearProcess()
        expect(context.redirectToFactoryUrl).toHaveBeenLastCalledWith(`${root}/department/index?departmentId=department4`)
        page.selectDepartment('department4')
        expect(context.redirectToFactoryUrl).toHaveBeenLastCalledWith(`${root}/department/index?departmentId=department4`)
        page.selectProcess('posttreatment2')
        expect(context.redirectToFactoryUrl).toHaveBeenLastCalledWith(`${root}/process/index?processId=posttreatment2`)
        page.openDevice({ deviceId: 'test /设备' })
        expect(context.navigateToFactoryUrl).toHaveBeenLastCalledWith(`${root}/equipment/index?deviceId=${encodeURIComponent('test /设备')}&from=${kind}`)
      } finally {
        unmounted.forEach(fn => fn())
        scope.stop()
      }
    })
  })
}
