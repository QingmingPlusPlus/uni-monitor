export type CssMapDeviceStatus =
  | 'production'
  | 'abnormalStop'
  | 'plannedStop'
  | 'changeover'
  | 'cleaning'
  | 'neutral'

export type CssMapStaffShift = 'short' | 'full'

export type CssMapStaffCategory = 'operator'

export type CssMapFiveMCategory = 'man' | 'machine' | 'material' | 'method' | 'environment'

export interface CssMapDeviceLayout {
  id: string
  name: string
  section: CssMapProcessValue | null
  x: number
  y: number
  w: number
  h: number
}

export type CssMapSelectionMode = 'department' | 'process'

export type CssMapDepartmentValue =
  | 'department1'
  | 'department2'
  | 'department3'
  | 'department4'

export type CssMapProcessValue =
  | 'pretreatment1'
  | 'vulcanization1'
  | 'posttreatment1'
  | 'pretreatment2'
  | 'vulcanization2'
  | 'posttreatment2'

export type CssMapSelectionValue = CssMapDepartmentValue | CssMapProcessValue

export interface CssMapRect {
  x: number
  y: number
  w: number
  h: number
}

export interface CssMapPoint {
  x: number
  y: number
}

export interface CssMapProcessBoundary {
  process: CssMapProcessValue
  labelKey: string
  points: CssMapPoint[]
  stroke: string
}

export interface CssMapProcessBoundaryAssignment {
  process: CssMapProcessValue
  boundary: CssMapProcessBoundary
}

export interface CssMapSelectionOption<T extends CssMapSelectionValue = CssMapSelectionValue> {
  mode: CssMapSelectionMode
  value: T
  labelKey: string
}

export interface CssMapSelectionDefaults {
  readonly department: CssMapDepartmentValue
  readonly process: CssMapProcessValue
}

export type CssMapDepartmentProcessMap = Readonly<Record<CssMapDepartmentValue, readonly CssMapProcessValue[]>>

export interface CssMapSelectionConfig {
  readonly departmentOptions: readonly CssMapSelectionOption<CssMapDepartmentValue>[]
  readonly processOptions: readonly CssMapSelectionOption<CssMapProcessValue>[]
  readonly departmentProcessMap: CssMapDepartmentProcessMap
  readonly defaults: CssMapSelectionDefaults
}

export interface CssMapJsonSource {
  imageWidth: number
  imageHeight: number
  coordinateOrigin: 'top-left'
  unit: 'px'
}

export interface CssMapJsonDevice {
  id: string
  name: string
  section: CssMapProcessValue | null
  x: number
  y: number
  width: number
  height: number
  deviceCode?: string
  deviceCodes?: string[]
  children?: CssMapJsonDeviceChild[]
}

export interface CssMapJsonDeviceChild {
  id: string
  name: string
  deviceCode: string
  x: number
  y: number
  width: number
  height: number
}

export interface CssMapJsonSection {
  id: CssMapProcessValue
  labelKey: string
  points: CssMapPoint[]
  stroke: string
}

export interface CssMapJsonConfig {
  source: CssMapJsonSource
  sections: CssMapJsonSection[]
  devices: CssMapJsonDevice[]
}

export interface CssMapStaffAssignment {
  id: string
  name: string
  category: CssMapStaffCategory
  shift: CssMapStaffShift
}

export interface CssMapFiveMChange {
  id: string
  category: CssMapFiveMCategory
  label: string
}

export interface CssMapDeviceRuntime {
  status: CssMapDeviceStatus | null
  loadRate: number | null
  staff: CssMapStaffAssignment[]
  fiveMChanges: CssMapFiveMChange[]
}

export interface CssMapDeviceChild {
  id: string
  name: string
  deviceCode: string
  x: number
  y: number
  w: number
  h: number
  runtime: CssMapDeviceRuntime
}

export interface CssMapDevice extends CssMapDeviceLayout {
  deviceCode?: string
  deviceCodes: string[]
  children: CssMapDeviceChild[]
  runtime: CssMapDeviceRuntime
}

export interface CssMapSize {
  width: number
  height: number
}

export interface CssMapDisplayOptions {
  showStatusColor: boolean
  showLoadRateColor: boolean
  showStaffing: boolean
  showFiveMChanges: boolean
}

export type CssMapDeviceDisplayMode = 'full' | 'compact' | 'summary' | 'micro'

export type CssMapScreenControlAction =
  | 'pan-up'
  | 'pan-down'
  | 'pan-left'
  | 'pan-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'reset'
  | 'focus'
  | 'select'

export interface CssMapDeviceScreenRect {
  width: number
  height: number
  scale: number
}
