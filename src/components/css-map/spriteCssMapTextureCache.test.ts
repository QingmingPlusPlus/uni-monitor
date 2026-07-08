import { describe, expect, it } from 'vitest'
import type {
  CssMapDevice,
  CssMapDisplayOptions,
} from './css3dMapTypes'
import { SpriteCssMapTextureCache, type SpriteCssMapDisposableTexture } from './spriteCssMapTextureCache'
import { createSpriteCssMapCanvasTheme } from './spriteCssMapTheme'

class FakeTexture implements SpriteCssMapDisposableTexture {
  needsUpdate = false

  disposed = false

  dispose(): void {
    this.disposed = true
  }
}

const display: CssMapDisplayOptions = {
  showStatusColor: true,
  showLoadRateColor: true,
  showStaffing: true,
  showFiveMChanges: true,
}

const metrics = {
  worldWidth: 100,
  worldHeight: 80,
  screenWidth: 160,
  screenHeight: 128,
  pixelRatio: 1,
}

function createDevice(loadRate: number): CssMapDevice {
  return {
    id: 'device-1',
    name: '测试设备',
    section: null,
    x: 0,
    y: 0,
    w: 100,
    h: 80,
    deviceCodes: ['D-01'],
    children: [],
    runtime: {
      status: 'production',
      loadRate,
      staff: [{
        id: 'staff-1',
        name: '张三',
        category: 'operator',
        shift: 'full',
      }],
      fiveMChanges: [{
        id: 'change-1',
        category: 'machine',
        label: '设备变化',
      }],
    },
  }
}

describe('SpriteCssMapTextureCache', () => {
  it('数据和布局不变时命中缓存', () => {
    let drawCount = 0
    const textures: FakeTexture[] = []
    const cache = new SpriteCssMapTextureCache<FakeTexture>({
      createCanvas: (width, height) => ({ width, height } as HTMLCanvasElement),
      createTexture: () => {
        const texture = new FakeTexture()
        textures.push(texture)
        return texture
      },
      drawDeviceCard: () => {
        drawCount += 1
      },
    })

    const first = cache.getOrCreate(createDevice(80), metrics, display, false, createSpriteCssMapCanvasTheme())
    const second = cache.getOrCreate(createDevice(80), metrics, display, false, createSpriteCssMapCanvasTheme())

    expect(first.cacheHit).toBe(false)
    expect(second.cacheHit).toBe(true)
    expect(second.texture).toBe(first.texture)
    expect(drawCount).toBe(1)
    expect(textures).toHaveLength(1)
  })

  it('运行态变化后重建纹理并释放旧纹理', () => {
    const textures: FakeTexture[] = []
    const cache = new SpriteCssMapTextureCache<FakeTexture>({
      createCanvas: (width, height) => ({ width, height } as HTMLCanvasElement),
      createTexture: () => {
        const texture = new FakeTexture()
        textures.push(texture)
        return texture
      },
      drawDeviceCard: () => undefined,
    })
    const theme = createSpriteCssMapCanvasTheme()
    const first = cache.getOrCreate(createDevice(80), metrics, display, false, theme)
    const second = cache.getOrCreate(createDevice(81), metrics, display, false, theme)

    expect(second.cacheHit).toBe(false)
    expect(second.texture).not.toBe(first.texture)
    expect(textures[0].disposed).toBe(true)
    expect(textures[1].disposed).toBe(false)

    cache.clear()

    expect(textures[1].disposed).toBe(true)
  })
})
