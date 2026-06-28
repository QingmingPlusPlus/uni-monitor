import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { createCss3dMapControls, type Css3dMapControls } from './css3dMapControls'
import type {
  CssMapDeviceLayout,
  CssMapDeviceScreenRect,
  CssMapProcessBoundary,
  CssMapRect,
  CssMapSize,
} from './css3dMapTypes'

const CSS3D_GROUND_ROTATION_X = -Math.PI / 2
const DEVICE_LAYER_ELEVATION = 90
const PROCESS_BOUNDARY_LAYER_ELEVATION = DEVICE_LAYER_ELEVATION
const FOCUS_PADDING_RATIO = 1.35

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

export interface Css3dMapDeviceElement {
  element: HTMLElement
  device: CssMapDeviceLayout
}

interface CreateCss3dMapSceneOptions {
  container: HTMLElement
  devices: Css3dMapDeviceElement[]
  processBoundaries?: CssMapProcessBoundary[]
  mapSize: CssMapSize
  onDeviceScreenRectsChange?: (rects: Record<string, CssMapDeviceScreenRect>) => void
}

export interface Css3dMapScene {
  render: () => void
  resize: () => void
  panBy: (deltaX: number, deltaZ: number) => void
  zoomBy: (factor: number) => void
  resetView: () => void
  focusRect: (rect: CssMapRect) => void
  dispose: () => void
}

function createMapPlane(mapSize: CssMapSize) {
  const plane = document.createElement('div')
  plane.className = 'css3d-map-plane'
  plane.style.width = `${mapSize.width}px`
  plane.style.height = `${mapSize.height}px`
  return plane
}

function createProcessBoundaryLayer(mapSize: CssMapSize, boundaries: CssMapProcessBoundary[]) {
  const layer = document.createElement('div')
  layer.className = 'css3d-map-process-boundaries'
  layer.style.width = `${mapSize.width}px`
  layer.style.height = `${mapSize.height}px`
  layer.style.pointerEvents = 'none'
  layer.setAttribute('aria-hidden', 'true')

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'css3d-map-process-boundaries__svg')
  svg.setAttribute('viewBox', `0 0 ${mapSize.width} ${mapSize.height}`)
  svg.setAttribute('width', String(mapSize.width))
  svg.setAttribute('height', String(mapSize.height))
  svg.style.pointerEvents = 'none'

  boundaries.forEach((boundary) => {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttribute('class', 'css3d-map-process-boundaries__polygon')
    polygon.setAttribute('points', boundary.points.map((point) => `${point.x},${point.y}`).join(' '))
    polygon.setAttribute('fill', 'transparent')
    polygon.setAttribute('stroke', boundary.stroke)
    polygon.setAttribute('data-css-map-process', boundary.process)
    polygon.style.pointerEvents = 'none'
    svg.appendChild(polygon)
  })

  layer.appendChild(svg)

  return layer
}

function mapLayoutToGroundPosition(
  layout: Pick<CssMapDeviceLayout, 'x' | 'y' | 'w' | 'h'>,
  mapSize: CssMapSize,
) {
  return new THREE.Vector3(
    layout.x - mapSize.width / 2 + layout.w / 2,
    DEVICE_LAYER_ELEVATION,
    layout.y - mapSize.height / 2 + layout.h / 2,
  )
}

function mapRectToGroundCenter(rect: CssMapRect, mapSize: CssMapSize) {
  return new THREE.Vector3(
    rect.x - mapSize.width / 2 + rect.w / 2,
    0,
    rect.y - mapSize.height / 2 + rect.h / 2,
  )
}

function setObjectOnGroundPlane(object: CSS3DObject, elevation = 0) {
  object.position.y = elevation
  object.rotation.x = CSS3D_GROUND_ROTATION_X
}

function positionDeviceObject(
  object: CSS3DObject,
  device: CssMapDeviceLayout,
  mapSize: CssMapSize,
) {
  object.element.dataset.cssMapDeviceId = device.id
  object.element.style.width = `${device.w}px`
  object.element.style.height = `${device.h}px`
  object.position.copy(mapLayoutToGroundPosition(device, mapSize))
  object.rotation.x = CSS3D_GROUND_ROTATION_X
}

function getDeviceLayoutKey(device: CssMapDeviceLayout) {
  return `${device.id}-${device.x}-${device.y}-${device.w}-${device.h}`
}

export function createCss3dMapScene(options: CreateCss3dMapSceneOptions): Css3dMapScene {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 50000)
  const renderer = new CSS3DRenderer()
  const root = new THREE.Group()
  let resizeObserver: ResizeObserver | null = null

  renderer.domElement.className = 'css3d-map-renderer'
  options.container.appendChild(renderer.domElement)

  const mapPlane = new CSS3DObject(createMapPlane(options.mapSize))
  setObjectOnGroundPlane(mapPlane)
  root.add(mapPlane)

  const processBoundaryLayer = options.processBoundaries?.length
    ? new CSS3DObject(createProcessBoundaryLayer(options.mapSize, options.processBoundaries))
    : null

  if (processBoundaryLayer) {
    setObjectOnGroundPlane(processBoundaryLayer, PROCESS_BOUNDARY_LAYER_ELEVATION)
    root.add(processBoundaryLayer)
  }

  const deviceObjects = options.devices.map(({ element, device }) => {
    const object = new CSS3DObject(element)
    positionDeviceObject(object, device, options.mapSize)
    root.add(object)
    return {
      object,
      device,
    }
  })

  scene.add(root)

  function publishDeviceScreenRects() {
    if (!options.onDeviceScreenRectsChange) return

    const rects = deviceObjects.reduce<Record<string, CssMapDeviceScreenRect>>((result, item) => {
      const rect = item.object.element.getBoundingClientRect()
      const xScale = item.device.w > 0 ? rect.width / item.device.w : 1
      const yScale = item.device.h > 0 ? rect.height / item.device.h : 1
      const scale = Math.max((xScale + yScale) / 2, 0.001)

      result[getDeviceLayoutKey(item.device)] = {
        width: Math.max(rect.width, 0),
        height: Math.max(rect.height, 0),
        scale,
      }

      return result
    }, {})

    options.onDeviceScreenRectsChange(rects)
  }

  function render() {
    renderer.render(scene, camera)
    publishDeviceScreenRects()
  }

  function fitCameraToMap() {
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const distance = computeFitDistance(options.mapSize, camera.aspect, fov)

    camera.up.set(0, 0, -1)
    camera.position.set(0, distance, 0)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
  }

  function resize() {
    const width = Math.max(options.container.clientWidth, 1)
    const height = Math.max(options.container.clientHeight, 1)

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    const fov = THREE.MathUtils.degToRad(camera.fov)
    controls.setMaxDistance(computeFitDistance(options.mapSize, camera.aspect, fov))

    renderer.setSize(width, height)
    render()
  }

  function focusRect(rect: CssMapRect) {
    if (rect.w <= 0 || rect.h <= 0) return

    const fov = THREE.MathUtils.degToRad(camera.fov)
    const fitDistance = computeFitDistance(options.mapSize, camera.aspect, fov)
    const focusDistance = computeRectFitDistance(rect, camera.aspect, fov)
    const target = mapRectToGroundCenter(rect, options.mapSize)

    controls.focusAt(target, Math.min(fitDistance, focusDistance))
  }

  const controls: Css3dMapControls = createCss3dMapControls({
    camera,
    domElement: renderer.domElement,
    resetCamera: fitCameraToMap,
    render,
    maxDistance: computeFitDistance(options.mapSize, camera.aspect, THREE.MathUtils.degToRad(camera.fov)),
  })

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(options.container)
  resize()
  controls.reset()

  return {
    render,
    resize,
    panBy: controls.panBy,
    zoomBy: controls.zoomBy,
    focusRect,
    resetView: controls.reset,
    dispose() {
      controls.dispose()
      resizeObserver?.disconnect()
      renderer.domElement.remove()
      deviceObjects.forEach(({ object }) => object.removeFromParent())
      processBoundaryLayer?.removeFromParent()
      mapPlane.removeFromParent()
      root.clear()
      scene.clear()
    },
  }
}
