import type {
  CssMapDepartmentProcessMap,
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
  CssMapSelectionOption,
} from './css3dMapTypes'

export const cssMapDepartmentOptions = [
  {
    mode: 'department',
    value: 'department1',
    labelKey: '制造1课',
  },
  {
    mode: 'department',
    value: 'department2',
    labelKey: '制造2课',
  },
  {
    mode: 'department',
    value: 'department3',
    labelKey: '制造3课',
  },
  {
    mode: 'department',
    value: 'department4',
    labelKey: '制造4课',
  },
] as const satisfies readonly CssMapSelectionOption<CssMapDepartmentValue>[]

export const cssMapProcessOptions = [
  {
    mode: 'process',
    value: 'pretreatment1',
    labelKey: '前处理1',
  },
  {
    mode: 'process',
    value: 'vulcanization1',
    labelKey: '加硫1',
  },
  {
    mode: 'process',
    value: 'posttreatment1',
    labelKey: '后处理1',
  },
  {
    mode: 'process',
    value: 'pretreatment2',
    labelKey: '前处理2',
  },
  {
    mode: 'process',
    value: 'vulcanization2',
    labelKey: '加硫2',
  },
  {
    mode: 'process',
    value: 'posttreatment2',
    labelKey: '后处理2',
  },
] as const satisfies readonly CssMapSelectionOption<CssMapProcessValue>[]

export const cssMapDepartmentProcessMap = {
  department1: ['pretreatment1', 'pretreatment2'],
  department2: ['vulcanization1'],
  department3: ['posttreatment1'],
  department4: ['vulcanization2', 'posttreatment2'],
} as const satisfies CssMapDepartmentProcessMap

export const defaultCssMapSelectionValues = {
  department: 'department1',
  process: 'pretreatment1',
} satisfies CssMapSelectionConfig['defaults']

export const defaultCssMapSelectionConfig = {
  departmentOptions: cssMapDepartmentOptions,
  processOptions: cssMapProcessOptions,
  departmentProcessMap: cssMapDepartmentProcessMap,
  defaults: defaultCssMapSelectionValues,
} satisfies CssMapSelectionConfig

export class CssMapSelectionConfigLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CssMapSelectionConfigLoadError'
  }
}

export function isCssMapDepartmentValue(value: string | null | undefined): value is CssMapDepartmentValue {
  return cssMapDepartmentOptions.some((option) => option.value === value)
}

export function isCssMapProcessValue(value: string | null | undefined): value is CssMapProcessValue {
  return cssMapProcessOptions.some((option) => option.value === value)
}

export function isCssMapDepartmentValueInConfig(
  value: string | null | undefined,
  config: CssMapSelectionConfig,
): value is CssMapDepartmentValue {
  return config.departmentOptions.some((option) => option.value === value)
}

export function isCssMapProcessValueInConfig(
  value: string | null | undefined,
  config: CssMapSelectionConfig,
): value is CssMapProcessValue {
  return config.processOptions.some((option) => option.value === value)
}

export function getCssMapDepartmentValue(
  value: string | null | undefined,
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): CssMapDepartmentValue {
  return isCssMapDepartmentValueInConfig(value, config) ? value : config.defaults.department
}

export function getCssMapProcessValue(
  value: string | null | undefined,
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): CssMapProcessValue {
  return isCssMapProcessValueInConfig(value, config) ? value : config.defaults.process
}

export function getCssMapDepartmentLabel(
  value: CssMapDepartmentValue,
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): string {
  return config.departmentOptions.find((option) => option.value === value)?.labelKey ?? value
}

export function getCssMapProcessLabel(
  value: CssMapProcessValue,
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): string {
  return config.processOptions.find((option) => option.value === value)?.labelKey ?? value
}

export function getCssMapDepartmentForProcess(
  value: CssMapProcessValue,
  config: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): CssMapDepartmentValue {
  const match = config.departmentOptions.find((option) =>
    config.departmentProcessMap[option.value].includes(value),
  )

  return match?.value ?? config.defaults.department
}

export function getCssMapProcessOptionsForDepartment(
  value: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
): readonly CssMapSelectionOption<CssMapProcessValue>[] {
  const allowedProcesses = config.departmentProcessMap[value]

  return config.processOptions.filter((option) => allowedProcesses.includes(option.value))
}
