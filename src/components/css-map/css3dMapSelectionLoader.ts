import type {
  CssMapDepartmentProcessMap,
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from './css3dMapTypes'
import {
  CssMapSelectionConfigLoadError,
  defaultCssMapSelectionConfig,
  isCssMapDepartmentValue,
  isCssMapProcessValue,
} from './css3dMapSelection'

interface CssMapSelectionJsonDefaults {
  readonly departmentId: CssMapDepartmentValue
  readonly processId: CssMapProcessValue
}

interface CssMapSelectionJsonDepartment {
  readonly id: CssMapDepartmentValue
  readonly label: string
  readonly processIds: readonly CssMapProcessValue[]
}

interface CssMapSelectionJsonProcess {
  readonly id: CssMapProcessValue
  readonly label: string
}

interface CssMapSelectionJsonConfig {
  readonly defaults: CssMapSelectionJsonDefaults
  readonly departments: readonly CssMapSelectionJsonDepartment[]
  readonly processes: readonly CssMapSelectionJsonProcess[]
}

const selectionConfigUrls = [
  '/factory-map/selection.json',
  '/static/factory-map/selection.json',
] as const

let selectionConfigPromise: Promise<CssMapSelectionConfig> | null = null

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

function isJsonDefaults(value: unknown): value is CssMapSelectionJsonDefaults {
  return (
    isRecord(value) &&
    isCssMapDepartmentValue(typeof value.departmentId === 'string' ? value.departmentId : undefined) &&
    isCssMapProcessValue(typeof value.processId === 'string' ? value.processId : undefined)
  )
}

function isJsonDepartment(value: unknown): value is CssMapSelectionJsonDepartment {
  return (
    isRecord(value) &&
    isCssMapDepartmentValue(typeof value.id === 'string' ? value.id : undefined) &&
    typeof value.label === 'string' &&
    Array.isArray(value.processIds) &&
    value.processIds.every((processId) => isCssMapProcessValue(
      typeof processId === 'string' ? processId : undefined,
    ))
  )
}

function isJsonProcess(value: unknown): value is CssMapSelectionJsonProcess {
  return (
    isRecord(value) &&
    isCssMapProcessValue(typeof value.id === 'string' ? value.id : undefined) &&
    typeof value.label === 'string'
  )
}

function isCssMapSelectionJsonConfig(value: unknown): value is CssMapSelectionJsonConfig {
  if (
    !isRecord(value) ||
    !isJsonDefaults(value.defaults) ||
    !Array.isArray(value.departments) ||
    !value.departments.every(isJsonDepartment) ||
    !Array.isArray(value.processes) ||
    !value.processes.every(isJsonProcess)
  ) {
    return false
  }

  const departmentIds = value.departments.map((department) => department.id)
  const processIds = value.processes.map((process) => process.id)
  const processIdSet = new Set(processIds)

  return (
    hasUniqueValues(departmentIds) &&
    hasUniqueValues(processIds) &&
    departmentIds.includes(value.defaults.departmentId) &&
    processIdSet.has(value.defaults.processId) &&
    value.departments.every((department) =>
      department.processIds.length > 0 &&
      department.processIds.every((processId) => processIdSet.has(processId)),
    )
  )
}

function createDepartmentProcessMap(
  departments: readonly CssMapSelectionJsonDepartment[],
): CssMapDepartmentProcessMap {
  const result: Record<CssMapDepartmentValue, CssMapProcessValue[]> = {
    department1: [],
    department2: [],
    department3: [],
    department4: [],
  }

  departments.forEach((department) => {
    result[department.id] = [...department.processIds]
  })

  return result
}

function createSelectionConfig(payload: CssMapSelectionJsonConfig): CssMapSelectionConfig {
  return {
    departmentOptions: payload.departments.map((department) => ({
      mode: 'department',
      value: department.id,
      labelKey: department.label,
    })),
    processOptions: payload.processes.map((process) => ({
      mode: 'process',
      value: process.id,
      labelKey: process.label,
    })),
    departmentProcessMap: createDepartmentProcessMap(payload.departments),
    defaults: {
      department: payload.defaults.departmentId,
      process: payload.defaults.processId,
    },
  }
}

async function fetchCssMapSelectionConfig(url: string): Promise<CssMapSelectionConfig> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new CssMapSelectionConfigLoadError(
      `Failed to load CSS map selection config ${url}: ${response.status}`,
    )
  }

  const payload: unknown = await response.json()

  if (!isCssMapSelectionJsonConfig(payload)) {
    throw new CssMapSelectionConfigLoadError(
      `CSS map selection config shape is invalid: ${url}`,
    )
  }

  return createSelectionConfig(payload)
}

async function fetchFirstCssMapSelectionConfig(): Promise<CssMapSelectionConfig> {
  const errors: string[] = []

  for (const url of selectionConfigUrls) {
    try {
      return await fetchCssMapSelectionConfig(url)
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error.message : `Unknown CSS map selection load error: ${url}`)
    }
  }

  throw new CssMapSelectionConfigLoadError(errors.join(' | '))
}

export async function loadCssMapSelectionConfig(): Promise<CssMapSelectionConfig> {
  selectionConfigPromise ??= fetchFirstCssMapSelectionConfig()
    .catch((error: unknown) => {
      if (error instanceof Error) {
        return defaultCssMapSelectionConfig
      }

      return defaultCssMapSelectionConfig
    })

  return selectionConfigPromise
}
