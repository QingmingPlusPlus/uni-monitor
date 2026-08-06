import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CssMapDevice,
  CssMapDisplayOptions,
  CssMapProcessBoundary,
  CssMapSize,
} from './css3dMapTypes'

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

const rendererRender = vi.fn()
const rendererSetSize = vi.fn()
const rendererSetPixelRatio = vi.fn()
const rendererSetClearColor = vi.fn()
const rendererDispose = vi.fn()
const backgroundTextureDispose = vi.fn()
const backgroundTexture = {
  colorSpace: '',
  dispose: backgroundTextureDispose,
}
const textureLoaderLoad = vi.fn(() => backgroundTexture)

const rendererDomElement = {
  className: '',
  style: {},
  remove: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600, x: 0, y: 0 })),
}

vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      domElement: rendererDomElement,
      render: rendererRender,
      setSize: rendererSetSize,
      setPixelRatio: rendererSetPixelRatio,
      setClearColor: rendererSetClearColor,
      dispose: rendererDispose,
    })),
    TextureLoader: vi.fn(() => ({ load: textureLoaderLoad })),
  }
})

const mockControls = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  update: vi.fn(),
  dispose: vi.fn(),
  target: { set: vi.fn(), copy: vi.fn(), x: 0, y: 0, z: 0 },
  maxDistance: 0,
  minDistance: 0,
  enablePan: false,
  enableZoom: false,
  enableRotate: false,
  screenSpacePanning: false,
  mouseButtons: {},
  touches: {},
}

vi.mock('three/examples/jsm/controls/MapControls.js', () => ({
  MapControls: vi.fn(() => mockControls),
}))

const originalDocument = globalThis.document
const originalResizeObserver = globalThis.ResizeObserver
const originalDevicePixelRatio = globalThis.devicePixelRatio

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.devicePixelRatio = 1

  globalThis.document = {
    createElement: vi.fn((tag: string) => createMockElement(tag)),
    createElementNS: vi.fn((_ns: string, tag: string) => createMockElement(tag)),
    documentElement: createMockElement('html'),
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
      getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600, x: 0, y: 0 })),
      ownerDocument: globalThis.document,
      parentNode: null,
      width: 0,
      height: 0,
      getContext: vi.fn(() => createMock2dContext()),
    }
    return el as unknown as HTMLElement
  }

  function createMock2dContext(): CanvasRenderingContext2D {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      clip: vi.fn(),
      setTransform: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D
  }

  globalThis.ResizeObserver = vi.fn(function (this: unknown, callback: () => void) {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), _callback: callback }
  }) as unknown as typeof ResizeObserver
})

afterEach(() => {
  globalThis.document = originalDocument
  globalThis.ResizeObserver = originalResizeObserver
  globalThis.devicePixelRatio = originalDevicePixelRatio
})

const display: CssMapDisplayOptions = {
  showStatusColor: true,
  showLoadRateColor: true,
  showStaffing: true,
  showFiveMChanges: true,
}

function createDevice(id: string, x: number, y: number, w: number, h: number): CssMapDevice {
  return {
    id,
    name: id,
    section: null,
    x,
    y,
    w,
    h,
    deviceCodes: ['D-01'],
    children: [],
    runtime: {
      status: 'production',
      loadRate: 80,
      staff: [],
      fiveMChanges: [],
    },
  }
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
  return (await import('./spriteCssMapScene')).createSpriteCssMapScene
}

describe('createSpriteCssMapScene', () => {
  it('返回包含全部公开方法的场景对象', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    expect(typeof scene.render).toBe('function')
    expect(typeof scene.resize).toBe('function')
    expect(typeof scene.panBy).toBe('function')
    expect(typeof scene.zoomBy).toBe('function')
    expect(typeof scene.resetView).toBe('function')
    expect(typeof scene.focusRect).toBe('function')
    expect(typeof scene.getCameraSnapshot).toBe('function')
    expect(typeof scene.setSelectMode).toBe('function')
    expect(typeof scene.dispose).toBe('function')
  })

  it('使用配置的底图纹理创建地图地面', async () => {
    const createSpriteCssMapScene = await importScene()
    createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      background: {
        imageUrl: '/static/factory-map/factory-floorplan.png',
        opacity: 0.46,
      },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    expect(textureLoaderLoad).toHaveBeenCalledWith(
      '/static/factory-map/factory-floorplan.png',
      expect.any(Function),
    )
  })

  it('render 调用 renderer.render', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererRender.mockClear()
    scene.render()

    expect(rendererRender).toHaveBeenCalledOnce()
  })

  it('resize 更新渲染器尺寸并重新渲染', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(400, 300),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererRender.mockClear()
    rendererSetSize.mockClear()
    scene.resize()

    expect(rendererSetSize).toHaveBeenCalledWith(400, 300)
    expect(rendererRender).toHaveBeenCalled()
  })

  it('resize 对零尺寸容器使用最小值 1 避免除零', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(0, 0),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    expect(() => scene.resize()).not.toThrow()
    expect(rendererSetSize).toHaveBeenCalledWith(1, 1)
  })

  it('focusRect 对零尺寸矩形不执行聚焦', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererRender.mockClear()
    scene.focusRect({ x: 0, y: 0, w: 0, h: 100 })
    expect(rendererRender).not.toHaveBeenCalled()

    scene.focusRect({ x: 0, y: 0, w: 100, h: 0 })
    expect(rendererRender).not.toHaveBeenCalled()
  })

  it('focusRect 对有效矩形触发渲染', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(800, 600),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererRender.mockClear()
    scene.focusRect({ x: 100, y: 100, w: 200, h: 160 })

    expect(rendererRender).toHaveBeenCalled()
  })

  it('setSelectMode 切换为相同值时不重新渲染', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererRender.mockClear()
    scene.setSelectMode(false)
    expect(rendererRender).not.toHaveBeenCalled()
  })

  it('setSelectMode 切换为不同值时重新渲染', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererRender.mockClear()
    scene.setSelectMode(true)
    expect(rendererRender).toHaveBeenCalled()
  })

  it('dispose 释放渲染器并移除 DOM', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    rendererDispose.mockClear()
    rendererDomElement.remove.mockClear()
    scene.dispose()

    expect(rendererDispose).toHaveBeenCalledOnce()
    expect(rendererDomElement.remove).toHaveBeenCalledOnce()
  })

  it('processBoundaries 非空时创建工艺边界层', async () => {
    const createSpriteCssMapScene = await importScene()
    const boundaries: CssMapProcessBoundary[] = [
      {
        process: 'pretreatment1',
        labelKey: 'label',
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
        stroke: '#fff',
      },
    ]

    expect(() =>
      createSpriteCssMapScene({
        container: createContainer(),
        devices: [],
        processBoundaries: boundaries,
        mapSize: { width: 1000, height: 800 },
        display,
        isSelectMode: () => false,
        openDevice: vi.fn(),
      }),
    ).not.toThrow()
  })

  it('设备列表非空时为每个设备创建 sprite', async () => {
    const createSpriteCssMapScene = await importScene()
    const devices = [
      createDevice('d1', 10, 20, 100, 80),
      createDevice('d2', 200, 100, 120, 90),
    ]

    expect(() =>
      createSpriteCssMapScene({
        container: createContainer(),
        devices,
        mapSize: { width: 1000, height: 800 },
        display,
        isSelectMode: () => false,
        openDevice: vi.fn(),
      }),
    ).not.toThrow()
  })

  it('panBy、zoomBy、resetView 不抛错', async () => {
    const createSpriteCssMapScene = await importScene()
    const scene = createSpriteCssMapScene({
      container: createContainer(),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    expect(() => scene.panBy(10, 20)).not.toThrow()
    expect(() => scene.zoomBy(0.5)).not.toThrow()
    expect(() => scene.resetView()).not.toThrow()
  })

  it('focusRect 计算的相机距离遵循 FOCUS_PADDING_RATIO', async () => {
    const createSpriteCssMapScene = await importScene()
    createSpriteCssMapScene({
      container: createContainer(800, 600),
      devices: [],
      mapSize: { width: 1000, height: 800 },
      display,
      isSelectMode: () => false,
      openDevice: vi.fn(),
    })

    const rect = { x: 100, y: 100, w: 200, h: 160 }
    const aspect = 800 / 600
    const fov = (42 * Math.PI) / 180
    const fitDistance = computeFitDistance({ width: 1000, height: 800 }, aspect, fov)
    const focusDistance = computeRectFitDistance(rect, aspect, fov)
    const expected = Math.min(fitDistance, focusDistance)

    expect(expected).toBeGreaterThan(0)
    expect(focusDistance).toBe(computeFitDistance({ width: 200, height: 160 }, aspect, fov) * FOCUS_PADDING_RATIO)
  })
})
