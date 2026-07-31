import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CssMapDeviceLayout, CssMapProcessBoundary, CssMapSize } from './css3dMapTypes'

const FOCUS_PADDING_RATIO = 1.35

function computeFitDistance(mapSize: CssMapSize, aspect: number, fovRadians: number): number {
  const zForHeight = mapSize.height / 2 / Math.tan(fovRadians / 2)
  const zForWidth = mapSize.width / 2 / (Math.tan(fovRadians / 2) * aspect)
  return Math.max(zForHeight, zForWidth)
}

function computeRectFitDistance(
  rect: { x: number; y: number; w: number; h: number },
  aspect: number,
  fovRadians: number,
): number {
  const zForHeight = rect.h / 2 / Math.tan(fovRadians / 2)
  const zForWidth = rect.w / 2 / (Math.tan(fovRadians / 2) * aspect)
  return Math.max(zForHeight, zForWidth) * FOCUS_PADDING_RATIO
}

const mockControls = {
  panBy: vi.fn(),
  zoomBy: vi.fn(),
  reset: vi.fn(),
  focusAt: vi.fn(),
  setMaxDistance: vi.fn(),
  dispose: vi.fn(),
}

vi.mock('./css3dMapControls', () => ({
  createCss3dMapControls: vi.fn(() => mockControls),
}))

const rendererRender = vi.fn()
const rendererSetSize = vi.fn()
const rendererDomElement = {
  className: '',
  style: {},
  remove: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

vi.mock('three/examples/jsm/renderers/CSS3DRenderer.js', () => {
  class MockCSS3DObject extends THREE.Object3D {
    element: HTMLElement
    constructor(element: HTMLElement) {
      super()
      this.element = element
    }
  }
  class MockCSS3DRenderer {
    domElement = rendererDomElement
    render = rendererRender
    setSize = rendererSetSize
  }
  return { CSS3DObject: MockCSS3DObject, CSS3DRenderer: MockCSS3DRenderer }
})

const originalDocument = globalThis.document
const originalResizeObserver = globalThis.ResizeObserver

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.document = {
    createElement: vi.fn((tag: string) => createMockElement(tag)),
    createElementNS: vi.fn((_ns: string, tag: string) => createMockElement(tag)),
  } as unknown as Document

  function createMockElement(tag: string): HTMLElement {
    const el: Record<string, unknown> = {
      tagName: tag,
      className: '',
      style: {},
      dataset: {},
      appendChild: vi.fn((child: unknown) => child),
      remove: vi.fn(),
      removeFromParent: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 100, height: 80, x: 0, y: 0 })),
      ownerDocument: globalThis.document,
      parentNode: null,
    }
    return el as unknown as HTMLElement
  }

  globalThis.ResizeObserver = vi.fn(function (this: unknown, callback: () => void) {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), _callback: callback }
  }) as unknown as typeof ResizeObserver
})

afterEach(() => {
  globalThis.document = originalDocument
  globalThis.ResizeObserver = originalResizeObserver
})

function createDevice(id: string, x: number, y: number, w: number, h: number): CssMapDeviceLayout {
  return { id, name: id, section: null, x, y, w, h }
}

function createContainer(width = 800, height = 600): HTMLElement {
  return {
    clientWidth: width,
    clientHeight: height,
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  } as unknown as HTMLElement
}

async function importScene() {
  return (await import('./css3dMapScene')).createCss3dMapScene
}

describe('createCss3dMapScene', () => {
  it('返回包含全部公开方法的场景对象', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    expect(typeof scene.render).toBe('function')
    expect(typeof scene.resize).toBe('function')
    expect(typeof scene.panBy).toBe('function')
    expect(typeof scene.zoomBy).toBe('function')
    expect(typeof scene.resetView).toBe('function')
    expect(typeof scene.focusRect).toBe('function')
    expect(typeof scene.dispose).toBe('function')
  })

  it('render 调用 renderer.render 并发布设备屏幕矩形', async () => {
    const createCss3dMapScene = await importScene()
    const onDeviceScreenRectsChange = vi.fn()
    const device = createDevice('d1', 10, 20, 100, 80)
    const element = {
      style: {},
      dataset: {},
      getBoundingClientRect: vi.fn(() => ({ width: 100, height: 80, x: 0, y: 0 })),
    } as unknown as HTMLElement

    const scene = createCss3dMapScene({
      container: createContainer(),
      devices: [{ element, device }],
      mapSize: { width: 1000, height: 800 },
      onDeviceScreenRectsChange,
    })

    rendererRender.mockClear()
    onDeviceScreenRectsChange.mockClear()
    scene.render()

    expect(rendererRender).toHaveBeenCalledOnce()
    expect(onDeviceScreenRectsChange).toHaveBeenCalledOnce()
    const rects = onDeviceScreenRectsChange.mock.calls[0][0] as Record<string, { width: number; height: number; scale: number }>
    const key = Object.keys(rects)[0]
    expect(key).toContain('d1-10-20-100-80-')
    expect(rects[key]).toEqual({ width: 100, height: 80, scale: 1 })
  })

  it('render 在未提供回调时不抛错', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    expect(() => scene.render()).not.toThrow()
    expect(rendererRender).toHaveBeenCalled()
  })

  it('resize 更新相机宽高比、渲染器尺寸并重新渲染', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(400, 300),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    rendererRender.mockClear()
    rendererSetSize.mockClear()
    scene.resize()

    expect(rendererSetSize).toHaveBeenCalledWith(400, 300)
    expect(rendererRender).toHaveBeenCalled()
  })

  it('resize 对零尺寸容器使用最小值 1 避免除零', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(0, 0),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    expect(() => scene.resize()).not.toThrow()
    expect(rendererSetSize).toHaveBeenCalledWith(1, 1)
  })

  it('focusRect 将相机聚焦到目标矩形（委托 controls.focusAt）', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(800, 600),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    mockControls.focusAt.mockClear()
    const rect = { x: 100, y: 100, w: 200, h: 160 }
    scene.focusRect(rect)

    expect(mockControls.focusAt).toHaveBeenCalledOnce()
    const [target, distance] = mockControls.focusAt.mock.calls[0] as [THREE.Vector3, number]
    expect(target.x).toBe(100 - 1000 / 2 + 200 / 2)
    expect(target.z).toBe(100 - 800 / 2 + 160 / 2)
    expect(target.y).toBe(0)
    const fov = THREE.MathUtils.degToRad(42)
    const fitDistance = computeFitDistance({ width: 1000, height: 800 }, 800 / 600, fov)
    const focusDistance = computeRectFitDistance(rect, 800 / 600, fov)
    expect(distance).toBe(Math.min(fitDistance, focusDistance))
  })

  it('focusRect 对零尺寸矩形不执行聚焦', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    mockControls.focusAt.mockClear()
    scene.focusRect({ x: 0, y: 0, w: 0, h: 100 })
    expect(mockControls.focusAt).not.toHaveBeenCalled()

    scene.focusRect({ x: 0, y: 0, w: 100, h: 0 })
    expect(mockControls.focusAt).not.toHaveBeenCalled()
  })

  it('panBy、zoomBy、resetView 委托给 controls', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    mockControls.panBy.mockClear()
    mockControls.zoomBy.mockClear()
    mockControls.reset.mockClear()

    scene.panBy(10, 20)
    expect(mockControls.panBy).toHaveBeenCalledWith(10, 20)

    scene.zoomBy(0.5)
    expect(mockControls.zoomBy).toHaveBeenCalledWith(0.5)

    scene.resetView()
    expect(mockControls.reset).toHaveBeenCalledOnce()
  })

  it('dispose 释放 controls、断开 ResizeObserver 并移除渲染器 DOM', async () => {
    const createCss3dMapScene = await importScene()
    const scene = createCss3dMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
    })

    mockControls.dispose.mockClear()
    rendererDomElement.remove.mockClear()
    scene.dispose()

    expect(mockControls.dispose).toHaveBeenCalledOnce()
    expect(rendererDomElement.remove).toHaveBeenCalledOnce()
  })

  it('processBoundaries 非空时创建工艺边界层', async () => {
    const createCss3dMapScene = await importScene()
    const boundaries: CssMapProcessBoundary[] = [
      {
        process: 'pretreatment1',
        labelKey: 'label',
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
        stroke: '#fff',
      },
    ]

    expect(() =>
      createCss3dMapScene({
        container: createContainer(),
        devices: [],
        processBoundaries: boundaries,
        mapSize: { width: 1000, height: 800 },
      }),
    ).not.toThrow()
  })
})