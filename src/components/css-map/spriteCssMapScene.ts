import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import type {
  CssMapDevice,
  CssMapDisplayOptions,
  CssMapProcessBoundary,
  CssMapRect,
  CssMapSize,
} from './css3dMapTypes'
import { SpriteCssMapTextureCache } from './spriteCssMapTextureCache'
import { createSpriteCssMapCanvasTheme } from './spriteCssMapTheme'
import {
  getCssMapDeviceShapeKey,
  isCssMapDevicePointInsideShape,
} from './cssMapDeviceShape'

const PROCESS_BOUNDARY_LAYER_ELEVATION = 1
const DEVICE_LAYER_ELEVATION = PROCESS_BOUNDARY_LAYER_ELEVATION
const FOCUS_PADDING_RATIO = 1.35
const MIN_CAMERA_DISTANCE = 120
const MAX_RENDERER_PIXEL_RATIO = 2
const TEXTURE_REFRESH_IDLE_MS = 140
const DEVICE_NAVIGATION_DOUBLE_TAP_MS = 420
const DEVICE_NAVIGATION_MOVE_TOLERANCE = 10
const DEVICE_NAVIGATION_TAP_DISTANCE = 28

interface SpriteCssMapSceneDevice {
  readonly device: CssMapDevice
  readonly sprite: THREE.Sprite
  readonly material: THREE.SpriteMaterial
}

interface DeviceNavigationPointerState {
  readonly key: string
  readonly pointerId: number
  readonly x: number
  readonly y: number
}

interface DeviceNavigationTapState {
  readonly key: string
  readonly time: number
  readonly x: number
  readonly y: number
}

interface CreateSpriteCssMapSceneOptions {
  readonly container: HTMLElement
  readonly devices: readonly CssMapDevice[]
  readonly processBoundaries?: readonly CssMapProcessBoundary[]
  readonly mapSize: CssMapSize
  readonly display: CssMapDisplayOptions
  readonly isSelectMode: () => boolean
  readonly openDevice: (deviceId: string) => void
}

export interface SpriteCssMapScene {
  readonly render: () => void
  readonly resize: () => void
  readonly panBy: (deltaX: number, deltaZ: number) => void
  readonly zoomBy: (factor: number) => void
  readonly resetView: () => void
  readonly focusRect: (rect: CssMapRect) => void
  readonly setSelectMode: (value: boolean) => void
  readonly dispose: () => void
}

function computeFitDistance(mapSize: CssMapSize, aspect: number, fovRadians: number): number {
  const zForHeight = mapSize.height / 2 / Math.tan(fovRadians / 2)
  const zForWidth = mapSize.width / 2 / (Math.tan(fovRadians / 2) * aspect)
  return Math.max(zForHeight, zForWidth)
}

function computeRectFitDistance(rect: CssMapRect, aspect: number, fovRadians: number): number {
  const zForHeight = rect.h / 2 / Math.tan(fovRadians / 2)
  const zForWidth = rect.w / 2 / (Math.tan(fovRadians / 2) * aspect)
  return Math.max(zForHeight, zForWidth) * FOCUS_PADDING_RATIO
}

function mapLayoutToGroundPosition(
  layout: Pick<CssMapDevice, 'x' | 'y' | 'w' | 'h'>,
  mapSize: CssMapSize,
): THREE.Vector3 {
  return new THREE.Vector3(
    layout.x - mapSize.width / 2 + layout.w / 2,
    DEVICE_LAYER_ELEVATION,
    layout.y - mapSize.height / 2 + layout.h / 2,
  )
}

function mapRectToGroundCenter(rect: CssMapRect, mapSize: CssMapSize): THREE.Vector3 {
  return new THREE.Vector3(
    rect.x - mapSize.width / 2 + rect.w / 2,
    0,
    rect.y - mapSize.height / 2 + rect.h / 2,
  )
}

function getDeviceLayoutKey(device: CssMapDevice): string {
  return `${device.id}-${device.x}-${device.y}-${device.w}-${device.h}-${getCssMapDeviceShapeKey(device)}`
}

function isPrimaryPointer(event: PointerEvent): boolean {
  return event.pointerType !== 'mouse' || event.button === 0
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function createBoundaryObject(boundary: CssMapProcessBoundary, mapSize: CssMapSize): THREE.LineLoop {
  const points = boundary.points.map((point) => (
    new THREE.Vector3(
      point.x - mapSize.width / 2,
      PROCESS_BOUNDARY_LAYER_ELEVATION,
      point.y - mapSize.height / 2,
    )
  ))
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(boundary.stroke),
    transparent: true,
    opacity: 0.92,
  })
  const line = new THREE.LineLoop(geometry, material)
  line.renderOrder = 2
  return line
}

function projectWorldRectToScreen(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  center: THREE.Vector3,
  width: number,
  height: number,
): { readonly width: number; readonly height: number } {
  const rect = renderer.domElement.getBoundingClientRect()
  const corners = [
    new THREE.Vector3(center.x - width / 2, center.y, center.z - height / 2),
    new THREE.Vector3(center.x + width / 2, center.y, center.z - height / 2),
    new THREE.Vector3(center.x + width / 2, center.y, center.z + height / 2),
    new THREE.Vector3(center.x - width / 2, center.y, center.z + height / 2),
  ].map((corner) => corner.project(camera))
  const xs = corners.map((corner) => (corner.x * 0.5 + 0.5) * rect.width)
  const ys = corners.map((corner) => (-corner.y * 0.5 + 0.5) * rect.height)

  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

export function createSpriteCssMapScene(options: CreateSpriteCssMapSceneOptions): SpriteCssMapScene {
  if (!isWebGLAvailable()) {
    throw new Error('WebGL 不可用，无法初始化 Sprite 地图')
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 50000)
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  const root = new THREE.Group()
  const textureCache = new SpriteCssMapTextureCache()
  const theme = createSpriteCssMapCanvasTheme(options.container)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let resizeObserver: ResizeObserver | null = null
  let textureRefreshTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  let selectMode = options.isSelectMode()
  let pointerDown: DeviceNavigationPointerState | null = null
  let lastTap: DeviceNavigationTapState | null = null

  renderer.domElement.className = 'sprite-css-map-renderer'
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO))
  options.container.appendChild(renderer.domElement)

  const boundaryObjects = (options.processBoundaries ?? []).map((boundary) => createBoundaryObject(boundary, options.mapSize))
  boundaryObjects.forEach((boundary) => root.add(boundary))

  const deviceObjects: SpriteCssMapSceneDevice[] = options.devices.map((device, index) => {
    const material = new THREE.SpriteMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(material)
    sprite.name = device.id
    sprite.userData.deviceId = device.id
    sprite.position.copy(mapLayoutToGroundPosition(device, options.mapSize))
    sprite.scale.set(device.w, device.h, 1)
    sprite.renderOrder = 10 + index
    root.add(sprite)
    return {
      device,
      sprite,
      material,
    }
  })

  scene.add(root)

  function render(): void {
    renderer.render(scene, camera)
  }

  function scheduleTextureRefresh(): void {
    if (textureRefreshTimer !== null) {
      globalThis.clearTimeout(textureRefreshTimer)
    }
    textureRefreshTimer = globalThis.setTimeout(() => {
      textureRefreshTimer = null
      refreshDeviceTextures()
      render()
    }, TEXTURE_REFRESH_IDLE_MS)
  }

  function clearTextureRefreshTimer(): void {
    if (textureRefreshTimer === null) return
    globalThis.clearTimeout(textureRefreshTimer)
    textureRefreshTimer = null
  }

  function getRendererPixelRatio(): number {
    return Math.min(globalThis.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO)
  }

  function refreshDeviceTextures(): void {
    const activeDeviceIds = new Set<string>()
    deviceObjects.forEach((item) => {
      activeDeviceIds.add(item.device.id)
      const screen = projectWorldRectToScreen(camera, renderer, item.sprite.position, item.device.w, item.device.h)
      const entry = textureCache.getOrCreate(
        item.device,
        {
          worldWidth: item.device.w,
          worldHeight: item.device.h,
          screenWidth: screen.width,
          screenHeight: screen.height,
          pixelRatio: getRendererPixelRatio(),
        },
        options.display,
        selectMode,
        theme,
      )

      if (item.material.map !== entry.texture) {
        item.material.map = entry.texture
        item.material.needsUpdate = true
      }
    })
    textureCache.disposeUnused(activeDeviceIds)
  }

  function fitCameraToMap(): void {
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const distance = computeFitDistance(options.mapSize, camera.aspect, fov)
    camera.up.set(0, 0, -1)
    camera.position.set(0, distance, 0)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
  }

  function resize(): void {
    const width = Math.max(options.container.clientWidth, 1)
    const height = Math.max(options.container.clientHeight, 1)

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(getRendererPixelRatio())
    renderer.setSize(width, height)

    const fov = THREE.MathUtils.degToRad(camera.fov)
    controls.maxDistance = computeFitDistance(options.mapSize, camera.aspect, fov)
    controls.update()
    refreshDeviceTextures()
    render()
  }

  function focusRect(rect: CssMapRect): void {
    if (rect.w <= 0 || rect.h <= 0) return

    const fov = THREE.MathUtils.degToRad(camera.fov)
    const fitDistance = computeFitDistance(options.mapSize, camera.aspect, fov)
    const focusDistance = computeRectFitDistance(rect, camera.aspect, fov)
    const target = mapRectToGroundCenter(rect, options.mapSize)

    camera.up.set(0, 0, -1)
    camera.position.set(target.x, Math.min(fitDistance, focusDistance), target.z)
    controls.target.copy(target)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    controls.update()
    refreshDeviceTextures()
    render()
  }

  function pickDevice(event: PointerEvent): SpriteCssMapSceneDevice | null {
    const rect = renderer.domElement.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    raycaster.setFromCamera(pointer, camera)
    const intersections = raycaster.intersectObjects(deviceObjects.map((item) => item.sprite), false)
    for (const intersection of intersections) {
      const item = deviceObjects.find((candidate) => candidate.sprite === intersection.object)
      if (!item) continue
      const uv = intersection.uv
      if (!uv || isCssMapDevicePointInsideShape(item.device, uv.x, 1 - uv.y)) {
        return item
      }
    }

    return null
  }

  function resetNavigation(): void {
    pointerDown = null
    lastTap = null
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!isPrimaryPointer(event)) return
    const hit = pickDevice(event)
    if (!hit) {
      pointerDown = null
      return
    }

    pointerDown = {
      key: getDeviceLayoutKey(hit.device),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!isPrimaryPointer(event)) return
    const hit = pickDevice(event)
    const currentPointerDown = pointerDown
    pointerDown = null
    if (!hit || !currentPointerDown || currentPointerDown.pointerId !== event.pointerId) return

    const key = getDeviceLayoutKey(hit.device)
    if (currentPointerDown.key !== key) return

    const moveDistance = Math.hypot(
      event.clientX - currentPointerDown.x,
      event.clientY - currentPointerDown.y,
    )
    if (moveDistance > DEVICE_NAVIGATION_MOVE_TOLERANCE) {
      lastTap = null
      return
    }

    if (options.isSelectMode()) {
      options.openDevice(hit.device.id)
      return
    }

    const currentLastTap = lastTap
    const tapDistance = currentLastTap
      ? Math.hypot(event.clientX - currentLastTap.x, event.clientY - currentLastTap.y)
      : Number.POSITIVE_INFINITY

    if (
      currentLastTap &&
      currentLastTap.key === key &&
      event.timeStamp - currentLastTap.time <= DEVICE_NAVIGATION_DOUBLE_TAP_MS &&
      tapDistance <= DEVICE_NAVIGATION_TAP_DISTANCE
    ) {
      options.openDevice(hit.device.id)
      return
    }

    lastTap = {
      key,
      time: event.timeStamp,
      x: event.clientX,
      y: event.clientY,
    }
  }

  const controls = new MapControls(camera, renderer.domElement)
  controls.enablePan = true
  controls.enableZoom = true
  controls.enableRotate = false
  controls.screenSpacePanning = true
  controls.minDistance = MIN_CAMERA_DISTANCE
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_PAN,
  }

  function handleControlsChange(): void {
    render()
    scheduleTextureRefresh()
  }

  controls.addEventListener('change', handleControlsChange)
  renderer.domElement.addEventListener('pointerdown', handlePointerDown)
  renderer.domElement.addEventListener('pointerup', handlePointerUp)
  renderer.domElement.addEventListener('pointercancel', resetNavigation)

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(options.container)
  fitCameraToMap()
  resize()

  return {
    render,
    resize,
    panBy(deltaX: number, deltaZ: number) {
      camera.position.x += deltaX
      camera.position.z += deltaZ
      controls.target.x += deltaX
      controls.target.z += deltaZ
      controls.update()
      render()
      scheduleTextureRefresh()
    },
    zoomBy(factor: number) {
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
      const currentDistance = Math.max(offset.length(), MIN_CAMERA_DISTANCE)
      const nextDistance = THREE.MathUtils.clamp(currentDistance * factor, MIN_CAMERA_DISTANCE, controls.maxDistance)

      offset.setLength(nextDistance)
      camera.position.copy(controls.target).add(offset)
      camera.updateMatrixWorld()
      controls.update()
      render()
      scheduleTextureRefresh()
    },
    resetView() {
      fitCameraToMap()
      controls.target.set(0, 0, 0)
      controls.update()
      refreshDeviceTextures()
      render()
    },
    focusRect,
    setSelectMode(value: boolean) {
      if (selectMode === value) return
      selectMode = value
      resetNavigation()
      refreshDeviceTextures()
      render()
    },
    dispose() {
      clearTextureRefreshTimer()
      resetNavigation()
      controls.removeEventListener('change', handleControlsChange)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointercancel', resetNavigation)
      resizeObserver?.disconnect()
      textureCache.clear()
      deviceObjects.forEach((item) => {
        item.material.dispose()
        item.sprite.removeFromParent()
      })
      boundaryObjects.forEach((boundary) => {
        boundary.geometry.dispose()
        const material = boundary.material
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose())
        } else {
          material.dispose()
        }
        boundary.removeFromParent()
      })
      root.clear()
      scene.clear()
      renderer.domElement.remove()
      renderer.dispose()
    },
  }
}
