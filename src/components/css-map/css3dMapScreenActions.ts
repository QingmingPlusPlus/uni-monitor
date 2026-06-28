import type { Css3dMapScene } from './css3dMapScene'
import type { CssMapScreenControlAction } from './css3dMapTypes'

const screenPanStep = 120
const zoomInFactor = 0.82
const zoomOutFactor = 1.18

export interface CssMapScreenActionHandlers {
  readonly scene: Css3dMapScene | null
  readonly focusActiveSelection: () => void
  readonly toggleSelectMode: () => void
}

function assertNever(value: never): never {
  throw new Error(`Unhandled map screen control action: ${value}`)
}

export function runCssMapScreenAction(
  action: CssMapScreenControlAction,
  handlers: CssMapScreenActionHandlers,
): void {
  switch (action) {
    case 'pan-up':
      handlers.scene?.panBy(0, -screenPanStep)
      return
    case 'pan-down':
      handlers.scene?.panBy(0, screenPanStep)
      return
    case 'pan-left':
      handlers.scene?.panBy(-screenPanStep, 0)
      return
    case 'pan-right':
      handlers.scene?.panBy(screenPanStep, 0)
      return
    case 'zoom-in':
      handlers.scene?.zoomBy(zoomInFactor)
      return
    case 'zoom-out':
      handlers.scene?.zoomBy(zoomOutFactor)
      return
    case 'reset':
      handlers.scene?.resetView()
      return
    case 'focus':
      handlers.focusActiveSelection()
      return
    case 'select':
      handlers.toggleSelectMode()
      return
    default:
      assertNever(action)
  }
}
