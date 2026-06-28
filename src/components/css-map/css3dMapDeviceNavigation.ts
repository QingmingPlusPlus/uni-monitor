import type { CssMapDevice } from './css3dMapTypes'

const deviceNavigationDoubleTapMs = 420
const deviceNavigationMoveTolerance = 10
const deviceNavigationTapDistance = 28

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

interface CreateCssMapDeviceNavigationOptions {
  readonly isSelectMode: () => boolean
  readonly openDevice: (deviceId: string) => void
}

export interface CssMapDeviceNavigation {
  readonly reset: () => void
  readonly handlePointerDown: (event: PointerEvent, device: CssMapDevice) => void
  readonly handlePointerCancel: () => void
  readonly handlePointerUp: (event: PointerEvent, device: CssMapDevice) => void
}

export function getCssMapDeviceLayoutKey(device: CssMapDevice): string {
  return `${device.id}-${device.x}-${device.y}-${device.w}-${device.h}`
}

function isPrimaryPointer(event: PointerEvent): boolean {
  return event.pointerType !== 'mouse' || event.button === 0
}

export function createCssMapDeviceNavigation(
  options: CreateCssMapDeviceNavigationOptions,
): CssMapDeviceNavigation {
  let pointerDown: DeviceNavigationPointerState | null = null
  let lastTap: DeviceNavigationTapState | null = null

  function reset(): void {
    pointerDown = null
    lastTap = null
  }

  function handlePointerDown(event: PointerEvent, device: CssMapDevice): void {
    if (!isPrimaryPointer(event)) return
    event.preventDefault()
    pointerDown = {
      key: getCssMapDeviceLayoutKey(device),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handlePointerUp(event: PointerEvent, device: CssMapDevice): void {
    if (!isPrimaryPointer(event)) return
    event.preventDefault()

    const key = getCssMapDeviceLayoutKey(device)
    const currentPointerDown = pointerDown
    pointerDown = null

    if (
      !currentPointerDown ||
      currentPointerDown.pointerId !== event.pointerId ||
      currentPointerDown.key !== key
    ) return

    const moveDistance = Math.hypot(
      event.clientX - currentPointerDown.x,
      event.clientY - currentPointerDown.y,
    )
    if (moveDistance > deviceNavigationMoveTolerance) {
      lastTap = null
      return
    }

    if (options.isSelectMode()) {
      options.openDevice(device.id)
      return
    }

    const currentLastTap = lastTap
    const tapDistance = currentLastTap
      ? Math.hypot(event.clientX - currentLastTap.x, event.clientY - currentLastTap.y)
      : Number.POSITIVE_INFINITY

    if (
      currentLastTap &&
      currentLastTap.key === key &&
      event.timeStamp - currentLastTap.time <= deviceNavigationDoubleTapMs &&
      tapDistance <= deviceNavigationTapDistance
    ) {
      options.openDevice(device.id)
      return
    }

    lastTap = {
      key,
      time: event.timeStamp,
      x: event.clientX,
      y: event.clientY,
    }
  }

  return {
    reset,
    handlePointerDown,
    handlePointerCancel: reset,
    handlePointerUp,
  }
}
