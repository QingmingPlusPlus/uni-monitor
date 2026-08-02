import type {
  CssMapDevice,
  CssMapDeviceStatus,
  CssMapDisplayOptions,
} from '../css3dMapTypes'
import type { SpriteCssMapCanvasTheme } from '../spriteCssMapTheme'
import type { SpriteCssMapDeviceCardLayout } from '../spriteCssMapDeviceLayout'

export const spriteCssMapStatusLabels: Readonly<Record<CssMapDeviceStatus, string>> = {
  production: '生产中',
  abnormalStop: '异常停止',
  plannedStop: '计划停止',
  changeover: '切替',
  cleaning: '清扫',
  neutral: '待确认',
}

export interface SpriteCssMapDeviceColorPlan {
  readonly statusBackground: string
  readonly statusBorder: string
  readonly statusColor: string
  readonly loadRateBackground: string
}

export interface SpriteCssMapDeviceCardDrawOptions {
  readonly device: CssMapDevice
  readonly display: CssMapDisplayOptions
  readonly layout: SpriteCssMapDeviceCardLayout
  readonly selectMode: boolean
  readonly theme: SpriteCssMapCanvasTheme
}

export interface DrawRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface FittedTextBlock {
  readonly fontSize: number
  readonly lines: readonly string[]
  readonly lineHeight: number
}

export interface RenderableMarkerSlots {
  readonly visibleMarkerCount: number
  readonly overflowCount: number
  readonly occupiedSlots: number
}
