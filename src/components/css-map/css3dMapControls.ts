import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'

interface Css3dMapControlsOptions {
  camera: THREE.PerspectiveCamera
  domElement: HTMLElement
  resetCamera: () => void
  render: () => void
  maxDistance?: number
}

export interface Css3dMapControls {
  reset: () => void
  focusAt: (target: THREE.Vector3, distance: number) => void
  setMaxDistance: (distance: number) => void
  dispose: () => void
}

export function createCss3dMapControls(options: Css3dMapControlsOptions): Css3dMapControls {
  const controls = new MapControls(options.camera, options.domElement)

  controls.enablePan = true
  controls.enableZoom = true
  controls.enableRotate = false
  controls.screenSpacePanning = true

  if (options.maxDistance !== undefined) {
    controls.maxDistance = options.maxDistance
  }
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_PAN,
  }

  function onChange() {
    options.render()
  }

  controls.addEventListener('change', onChange)

  return {
    reset() {
      options.resetCamera()
      controls.target.set(0, 0, 0)
      controls.update()
      options.render()
    },
    focusAt(target, distance) {
      options.camera.up.set(0, 0, -1)
      options.camera.position.set(target.x, distance, target.z)
      controls.target.copy(target)
      options.camera.lookAt(target)
      options.camera.updateMatrixWorld()
      controls.update()
      options.render()
    },
    setMaxDistance(distance: number) {
      controls.maxDistance = distance
      controls.update()
    },
    dispose() {
      controls.removeEventListener('change', onChange)
      controls.dispose()
    },
  }
}
