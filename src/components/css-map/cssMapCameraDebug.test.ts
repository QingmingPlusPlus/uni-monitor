import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCssMapCameraSnapshot,
  installCssMapCameraDebug,
} from './cssMapCameraDebug'

const originalWindow = globalThis.window

afterEach(() => {
  globalThis.window = originalWindow
  vi.restoreAllMocks()
})

describe('createCssMapCameraSnapshot', () => {
  it('输出可重新传给 focusRect 的当前视口矩形', () => {
    const snapshot = createCssMapCameraSnapshot({
      renderer: 'sprite',
      mapSize: { width: 2060, height: 1280 },
      viewport: { width: 1000, height: 500 },
      position: { x: 100, y: 500, z: -50 },
      target: { x: 100, y: 0, z: -50 },
      up: { x: 0, y: 0, z: -1 },
      fov: 42,
      aspect: 2,
      near: 1,
      far: 50000,
    })

    const expectedHeight = 2 * 500 / 1.35 * Math.tan(42 * Math.PI / 360)
    expect(snapshot.camera.distance).toBe(500)
    expect(snapshot.focus.rect.w).toBeCloseTo(expectedHeight * 2, 3)
    expect(snapshot.focus.rect.h).toBeCloseTo(expectedHeight, 3)
    expect(snapshot.focus.rect.x + snapshot.focus.rect.w / 2).toBeCloseTo(1130, 2)
    expect(snapshot.focus.rect.y + snapshot.focus.rect.h / 2).toBeCloseTo(590, 2)
  })
})

describe('installCssMapCameraDebug', () => {
  it('window.mapCamera 返回最后挂载场景并在卸载后恢复前一个场景', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    globalThis.window = {} as Window & typeof globalThis
    const first = createCssMapCameraSnapshot({
      renderer: 'sprite',
      mapSize: { width: 100, height: 80 },
      viewport: { width: 100, height: 80 },
      position: { x: 0, y: 200, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: -1 },
      fov: 42,
      aspect: 1.25,
      near: 1,
      far: 50000,
    })
    const second = { ...first, renderer: 'css3d' as const }

    const uninstallFirst = installCssMapCameraDebug(() => first)
    const uninstallSecond = installCssMapCameraDebug(() => second)

    expect(window.mapCamera?.()).toEqual(second)
    uninstallSecond()
    expect(window.mapCamera?.()).toEqual(first)
    uninstallFirst()
    expect(window.mapCamera).toBeUndefined()
    expect(info).toHaveBeenCalled()
  })
})
