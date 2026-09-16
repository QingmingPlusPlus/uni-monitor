import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { computed, effectScope, nextTick, ref, shallowRef, watch } from 'vue'
import { describe, expect, it, vi } from 'vitest'

function deferred() {
  let resolve!: (value?: unknown) => void
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

for (const kind of ['department', 'process'] as const) {
  describe(`${kind} 初始化`, () => {
    it('配置和路由就绪后只请求目标维度一次，不先查询默认一科', async () => {
      const file = readFileSync(new URL(`../../${kind}/index.vue`, import.meta.url), 'utf8')
      const script = file.split('<script setup lang="ts">')[1].split('</script>')[0]
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
        computed, ref, shallowRef, watch,
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
      const body = parsed.statements.filter(s => !ts.isImportDeclaration(s)).map(s => s.getText(parsed)).join('\n')
      const compiled = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
      const scope = effectScope()
      try {
        scope.run(() => new Function(...Object.keys(context), compiled)(...Object.values(context)))
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
      } finally {
        unmounted.forEach(fn => fn())
        scope.stop()
      }
    })
  })
}
