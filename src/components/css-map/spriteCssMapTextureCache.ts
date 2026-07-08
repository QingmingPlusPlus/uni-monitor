import * as THREE from 'three'
import type {
  CssMapDevice,
  CssMapDisplayOptions,
} from './css3dMapTypes'
import {
  createSpriteCssMapDeviceTextureKey,
  drawSpriteCssMapDeviceCard,
} from './spriteCssMapDeviceCard'
import {
  planSpriteCssMapDeviceCard,
  type SpriteCssMapDeviceCardLayout,
  type SpriteCssMapDeviceCardMetrics,
} from './spriteCssMapDeviceLayout'
import type { SpriteCssMapCanvasTheme } from './spriteCssMapTheme'

export interface SpriteCssMapDisposableTexture {
  needsUpdate?: boolean
  dispose: () => void
}

export interface SpriteCssMapTextureCacheEntry<TTexture extends SpriteCssMapDisposableTexture> {
  readonly key: string
  readonly texture: TTexture
  readonly layout: SpriteCssMapDeviceCardLayout
  readonly cacheHit: boolean
}

export interface SpriteCssMapTextureCacheOptions<TTexture extends SpriteCssMapDisposableTexture> {
  readonly createCanvas?: (width: number, height: number) => HTMLCanvasElement
  readonly createTexture?: (canvas: HTMLCanvasElement) => TTexture
  readonly drawDeviceCard?: (
    canvas: HTMLCanvasElement,
    options: {
      readonly device: CssMapDevice
      readonly display: CssMapDisplayOptions
      readonly layout: SpriteCssMapDeviceCardLayout
      readonly selectMode: boolean
      readonly theme: SpriteCssMapCanvasTheme
    },
  ) => void
}

interface CachedTexture<TTexture extends SpriteCssMapDisposableTexture> {
  readonly key: string
  readonly texture: TTexture
  readonly layout: SpriteCssMapDeviceCardLayout
}

function createDefaultCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function createDefaultTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2
  texture.needsUpdate = true
  return texture
}

export class SpriteCssMapTextureCache<
  TTexture extends SpriteCssMapDisposableTexture = THREE.CanvasTexture,
> {
  private readonly cache = new Map<string, CachedTexture<TTexture>>()

  private readonly createCanvas: (width: number, height: number) => HTMLCanvasElement

  private readonly createTexture: (canvas: HTMLCanvasElement) => TTexture

  private readonly drawDeviceCard: NonNullable<SpriteCssMapTextureCacheOptions<TTexture>['drawDeviceCard']>

  constructor(options: SpriteCssMapTextureCacheOptions<TTexture> = {}) {
    this.createCanvas = options.createCanvas ?? createDefaultCanvas
    this.createTexture = options.createTexture ?? (createDefaultTexture as unknown as (canvas: HTMLCanvasElement) => TTexture)
    this.drawDeviceCard = options.drawDeviceCard ?? drawSpriteCssMapDeviceCard
  }

  getOrCreate(
    device: CssMapDevice,
    metrics: SpriteCssMapDeviceCardMetrics,
    display: CssMapDisplayOptions,
    selectMode: boolean,
    theme: SpriteCssMapCanvasTheme,
  ): SpriteCssMapTextureCacheEntry<TTexture> {
    const layout = planSpriteCssMapDeviceCard(metrics)
    const key = createSpriteCssMapDeviceTextureKey(device, display, layout, selectMode)
    const current = this.cache.get(device.id)

    if (current?.key === key) {
      return {
        key,
        texture: current.texture,
        layout: current.layout,
        cacheHit: true,
      }
    }

    current?.texture.dispose()

    const canvas = this.createCanvas(layout.pixelWidth, layout.pixelHeight)
    this.drawDeviceCard(canvas, {
      device,
      display,
      layout,
      selectMode,
      theme,
    })
    const texture = this.createTexture(canvas)
    texture.needsUpdate = true
    this.cache.set(device.id, {
      key,
      texture,
      layout,
    })

    return {
      key,
      texture,
      layout,
      cacheHit: false,
    }
  }

  disposeDevice(deviceId: string): void {
    const current = this.cache.get(deviceId)
    current?.texture.dispose()
    this.cache.delete(deviceId)
  }

  disposeUnused(activeDeviceIds: ReadonlySet<string>): void {
    Array.from(this.cache.keys()).forEach((deviceId) => {
      if (!activeDeviceIds.has(deviceId)) {
        this.disposeDevice(deviceId)
      }
    })
  }

  clear(): void {
    this.cache.forEach((entry) => entry.texture.dispose())
    this.cache.clear()
  }
}
