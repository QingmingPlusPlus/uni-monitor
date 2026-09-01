import type { CssMapBackground, CssMapSize } from './css3dMapTypes'

export function getCssMapBackgroundVisibleHeight(
  background: CssMapBackground,
  mapSize: CssMapSize,
): number {
  const requestedHeight = background.visibleHeight
  if (!Number.isFinite(requestedHeight)) return mapSize.height

  return Math.min(Math.max(requestedHeight as number, 1), mapSize.height)
}
