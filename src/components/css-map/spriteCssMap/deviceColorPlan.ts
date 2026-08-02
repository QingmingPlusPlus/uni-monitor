import {
  getCssMapLoadRateBackground,
  getCssMapTitleStyle,
} from '../css3dMapPalette'
import {
  planCssMapDeviceContent,
  type CssMapDeviceContentPlan,
} from '../cssMapDeviceContentLayout'
import {
  resolveSpriteCssMapColorToken,
  type SpriteCssMapCanvasTheme,
} from '../spriteCssMapTheme'
import type {
  CssMapDevice,
  CssMapDeviceRuntime,
  CssMapDisplayOptions,
} from '../css3dMapTypes'
import type { SpriteCssMapDeviceCardLayout } from '../spriteCssMapDeviceLayout'
import type { SpriteCssMapDeviceColorPlan } from './types'

import type { CssMapDeviceStatus } from '../css3dMapTypes'
import { spriteCssMapStatusLabels } from './types'

function createRuntimeKey(runtime: CssMapDeviceRuntime): string {
  return [
    runtime.status ?? 'null',
    runtime.loadRate === null ? 'null' : runtime.loadRate.toFixed(1),
    runtime.staff.map((staff) => `${staff.id}:${staff.shift}:${staff.category}`).join(','),
    runtime.fiveMChanges.map((change) => `${change.id}:${change.category}:${change.label}`).join(','),
  ].join('|')
}

export function createSpriteCssMapDeviceTextureKey(
  device: CssMapDevice,
  display: CssMapDisplayOptions,
  layout: SpriteCssMapDeviceCardLayout,
  selectMode: boolean,
): string {
  const contentPlan = getSpriteCssMapDeviceContentPlan(
    device,
    display,
    layout.logicalWidth,
    layout.logicalHeight,
  )

  return [
    device.id,
    device.polygon?.map((point) => `${point.x},${point.y}`).join(';') ?? 'rectangle',
    device.contentLayout ?? 'standard-layout',
    layout.cacheBucket,
    contentPlan.cacheKey,
    selectMode ? 'select' : 'normal',
    display.showStatusColor ? 'status-on' : 'status-off',
    display.showLoadRateColor ? 'load-on' : 'load-off',
    display.showStaffing ? 'staff-on' : 'staff-off',
    display.showFiveMChanges ? '5m-on' : '5m-off',
    createRuntimeKey(device.runtime),
  ].join('::')
}

export function formatSpriteCssMapLoadRate(value: number | null): string {
  return value === null ? '--' : `${value.toFixed(1)}%`
}

export function getSpriteCssMapStatusLabel(status: CssMapDeviceStatus | null): string {
  return status === null ? '待确认' : spriteCssMapStatusLabels[status]
}

export function getSpriteCssMapDeviceContentPlan(
  device: CssMapDevice,
  display: CssMapDisplayOptions,
  surfaceWidth: number,
  surfaceHeight: number,
): CssMapDeviceContentPlan {
  return planCssMapDeviceContent({
    worldWidth: device.w,
    worldHeight: device.h,
    surfaceWidth,
    surfaceHeight,
    name: device.name,
    statusLabel: getSpriteCssMapStatusLabel(device.runtime.status),
    loadRateLabel: formatSpriteCssMapLoadRate(device.runtime.loadRate),
    staffCount: display.showStaffing ? device.runtime.staff.length : 0,
    fiveMCount: display.showFiveMChanges ? device.runtime.fiveMChanges.length : 0,
    showStaffing: display.showStaffing,
    showFiveMChanges: display.showFiveMChanges,
  })
}

export function getSpriteCssMapDeviceColorPlan(
  device: CssMapDevice,
  display: CssMapDisplayOptions,
  theme: SpriteCssMapCanvasTheme,
): SpriteCssMapDeviceColorPlan {
  const status = getCssMapTitleStyle(device.runtime.status, display.showStatusColor)

  return {
    statusBackground: resolveSpriteCssMapColorToken(status.background, theme),
    statusBorder: resolveSpriteCssMapColorToken(status.border, theme),
    statusColor: resolveSpriteCssMapColorToken(status.color, theme),
    loadRateBackground: resolveSpriteCssMapColorToken(
      getCssMapLoadRateBackground(device.runtime.loadRate, display.showLoadRateColor),
      theme,
    ),
  }
}
