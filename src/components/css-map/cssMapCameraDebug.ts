import type {
  CssMapCameraSnapshot,
  CssMapSize,
  CssMapVector3Snapshot,
} from './css3dMapTypes'

export const CSS_MAP_FOCUS_PADDING_RATIO = 1.35

export interface CssMapCameraSnapshotInput {
  readonly renderer: CssMapCameraSnapshot['renderer']
  readonly mapSize: CssMapSize
  readonly viewport: CssMapCameraSnapshot['viewport']
  readonly position: CssMapVector3Snapshot
  readonly target: CssMapVector3Snapshot
  readonly up: CssMapVector3Snapshot
  readonly fov: number
  readonly aspect: number
  readonly near: number
  readonly far: number
}

type CssMapCameraSnapshotProvider = () => CssMapCameraSnapshot | null

declare global {
  interface Window {
    mapCamera?: () => CssMapCameraSnapshot | null
  }
}

const providers: Array<{
  readonly token: symbol
  readonly getSnapshot: CssMapCameraSnapshotProvider
}> = []

let installedTool: Window['mapCamera'] | null = null

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function roundVector(vector: CssMapVector3Snapshot): CssMapVector3Snapshot {
  return {
    x: round(vector.x),
    y: round(vector.y),
    z: round(vector.z),
  }
}

export function createCssMapCameraSnapshot(
  input: CssMapCameraSnapshotInput,
): CssMapCameraSnapshot {
  const deltaX = input.position.x - input.target.x
  const deltaY = input.position.y - input.target.y
  const deltaZ = input.position.z - input.target.z
  const distance = Math.hypot(deltaX, deltaY, deltaZ)
  const fovRadians = input.fov * Math.PI / 180
  const focusHeight = 2 * distance / CSS_MAP_FOCUS_PADDING_RATIO * Math.tan(fovRadians / 2)
  const focusWidth = focusHeight * input.aspect
  const focusCenterX = input.target.x + input.mapSize.width / 2
  const focusCenterY = input.target.z + input.mapSize.height / 2

  return {
    renderer: input.renderer,
    mapSize: {
      width: round(input.mapSize.width),
      height: round(input.mapSize.height),
    },
    viewport: {
      width: round(input.viewport.width),
      height: round(input.viewport.height),
    },
    camera: {
      position: roundVector(input.position),
      target: roundVector(input.target),
      up: roundVector(input.up),
      fov: round(input.fov),
      aspect: round(input.aspect),
      near: round(input.near),
      far: round(input.far),
      distance: round(distance),
    },
    focus: {
      paddingRatio: CSS_MAP_FOCUS_PADDING_RATIO,
      rect: {
        x: round(focusCenterX - focusWidth / 2),
        y: round(focusCenterY - focusHeight / 2),
        w: round(focusWidth),
        h: round(focusHeight),
      },
    },
  }
}

function getBrowserWindow(): Window | null {
  return typeof window === 'undefined' ? null : window
}

function ensureToolInstalled(win: Window): void {
  if (installedTool && win.mapCamera === installedTool) return

  installedTool = () => {
    const snapshot = providers.at(-1)?.getSnapshot() ?? null
    if (snapshot) {
      console.info('[css-map] camera / focus parameters\n', JSON.stringify(snapshot, null, 2))
    } else {
      console.info('[css-map] no active map scene')
    }
    return snapshot
  }
  win.mapCamera = installedTool
}

export function installCssMapCameraDebug(
  getSnapshot: CssMapCameraSnapshotProvider,
): () => void {
  const win = getBrowserWindow()
  if (!win) return () => undefined

  const token = Symbol('css-map-camera-provider')
  providers.push({ token, getSnapshot })
  ensureToolInstalled(win)

  return () => {
    const index = providers.findIndex((provider) => provider.token === token)
    if (index >= 0) providers.splice(index, 1)

    if (providers.length === 0 && installedTool && win.mapCamera === installedTool) {
      delete win.mapCamera
      installedTool = null
    }
  }
}
