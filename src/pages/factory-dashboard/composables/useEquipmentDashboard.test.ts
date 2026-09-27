import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { loadCssMapData } from '../../../components/css-map/css3dMapLiveData'
import { defaultCssMapSelectionConfig } from '../../../components/css-map/css3dMapSelection'
import { loadCssMapSelectionConfig } from '../../../components/css-map/css3dMapSelectionLoader'
import { loadEquipmentDetailData } from '../data/loaders/loadEquipmentDetailData'
import { redirectToFactoryUrl } from '../utils/factoryRoutes'
import { useEquipmentDashboard } from './useEquipmentDashboard'

const lifecycle = vi.hoisted(() => ({
  mounted: () => {},
  unmounted: () => {},
  sync: () => {},
  stop: vi.fn(),
  query: { deviceId: 'child', from: 'process' },
}))
vi.mock('@dcloudio/uni-app', () => ({ onLoad: (fn: Function) => fn(lifecycle.query) }))
vi.mock('vue', async importOriginal => ({
  ...await importOriginal<typeof import('vue')>(),
  onMounted: (fn: () => void) => { lifecycle.mounted = fn },
  onBeforeUnmount: (fn: () => void) => { lifecycle.unmounted = fn },
}))
vi.mock('../../../components/css-map/css3dMapLiveData', () => ({ loadCssMapData: vi.fn() }))
vi.mock('../../../components/css-map/css3dMapSelectionLoader', () => ({ loadCssMapSelectionConfig: vi.fn() }))
vi.mock('../data/loaders/loadEquipmentDetailData', () => ({ loadEquipmentDetailData: vi.fn() }))
vi.mock('../utils/factoryRoutes', async importOriginal => ({
  ...await importOriginal<typeof import('../utils/factoryRoutes')>(),
  redirectToFactoryUrl: vi.fn(),
  readCurrentFactoryRouteQuery: () => lifecycle.query,
  subscribeFactoryRouteQueryChange: (fn: () => void) => { lifecycle.sync = fn; return lifecycle.stop },
}))

const device = {
  id: 'parent', name: '设备组', section: 'pretreatment1', x: 0, y: 0, w: 10, h: 10,
  deviceCode: '1101', deviceCodes: ['1101'],
  runtime: { staff: [] },
  children: [{ id: 'child', name: '子设备', deviceCode: '1102', runtime: { staff: [] } }],
}
async function flush() {
  for (let i = 0; i < 8; i++) await nextTick()
}
function setup(terminal: 'pc' | 'screen' = 'pc') {
  lifecycle.query = { deviceId: 'child', from: 'process' }
  vi.mocked(loadCssMapSelectionConfig).mockResolvedValue(defaultCssMapSelectionConfig)
  vi.mocked(loadCssMapData).mockResolvedValue({ devices: [device] } as never)
  // 让详情请求保持待定，单独控制先后返回顺序。
  vi.mocked(loadEquipmentDetailData).mockImplementation(() => new Promise(() => {}))
  const scope = effectScope()
  const page = scope.run(() => useEquipmentDashboard(terminal))!
  lifecycle.mounted()
  return { page, stop: () => { lifecycle.unmounted(); scope.stop() } }
}
afterEach(() => vi.clearAllMocks())

describe('设备维度双端共享逻辑', () => {
  it.each(['pc', 'screen'] as const)('%s 定位子设备并按来源返回对应端', async terminal => {
    const { page, stop } = setup(terminal)
    try {
      await flush()
      expect(loadEquipmentDetailData).toHaveBeenLastCalledWith(expect.objectContaining({
        id: 'child', deviceCode: '1102', section: 'pretreatment1', children: [],
      }), 'child')
      const root = terminal === 'pc' ? '/pages-pc' : '/pages'
      page.handleBack()
      expect(redirectToFactoryUrl).toHaveBeenLastCalledWith(`${root}/process/index?processId=pretreatment1`)
      lifecycle.query = { deviceId: 'parent', from: 'invalid' }
      lifecycle.sync()
      await flush()
      expect(loadEquipmentDetailData).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'parent' }), 'parent')
      page.handleBack()
      expect(redirectToFactoryUrl).toHaveBeenLastCalledWith(`${root}/department/index?departmentId=department1`)
    } finally { stop() }
    expect(lifecycle.stop).toHaveBeenCalledTimes(1)
  })

  it('切换设备及卸载后忽略迟到的详情结果', async () => {
    const { page, stop } = setup()
    await flush()
    let resolveOld!: (data: never) => void
    let resolveCurrent!: (data: never) => void
    vi.mocked(loadEquipmentDetailData)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveCurrent = resolve }))
    lifecycle.query.deviceId = 'parent'
    lifecycle.sync()
    await flush()
    lifecycle.query.deviceId = 'child'
    lifecycle.sync()
    await flush()
    const current = page.detailData.value
    resolveOld({ title: '旧设备' } as never)
    await flush()
    expect(page.detailData.value).toBe(current)
    stop()
    resolveCurrent({ title: '已卸载页面' } as never)
    await flush()
    expect(page.detailData.value).toBe(current)
  })
})
